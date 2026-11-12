import { Dimensions, PixelRatio, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import { Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { APP_VERSION } from './app-meta';
import { osFrom, browserDeviceName, readBrowserBattery, readBrowserStorage, type BrowserNavigator } from './browser-capabilities';
import { normalizeBattery, storageFromCapacity, supportsLowPowerMode, validStorage } from './capabilities';
import { currentRuntimeLabel, estimated, finitePositive, measured, unavailable, type BatteryReading, type DeviceSnapshot, type Reading, type StorageReading } from './diagnostics';

const browserNavigator = () => typeof navigator !== 'undefined' ? navigator as unknown as BrowserNavigator : null;

export async function readBattery(): Promise<Reading<BatteryReading>> {
  if (Platform.OS === 'web') return readBrowserBattery(browserNavigator());
  try {
    if (!await Battery.isAvailableAsync()) return unavailable('Expo Battery', 'The battery API is unavailable on this device or simulator.');
    const powerSaverSupported = supportsLowPowerMode(Platform.OS, Device.osVersion);
    const [level, state, lowPower] = await Promise.all([
      Battery.getBatteryLevelAsync().catch(() => -1),
      Battery.getBatteryStateAsync().catch(() => Battery.BatteryState.UNKNOWN),
      powerSaverSupported ? Battery.isLowPowerModeEnabledAsync().catch(() => null) : Promise.resolve(null),
    ]);
    const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL ? true : state === Battery.BatteryState.UNPLUGGED ? false : null;
    const value = normalizeBattery(level, charging, lowPower);
    if (!value) return unavailable('Expo Battery', 'No valid battery charge is available on this device or simulator.');
    return measured(value, 'Expo Battery', `Charge is not battery condition or wear.${value.lowPower === null ? ' Low-power mode is not exposed here.' : ''}`);
  } catch {
    return unavailable('Expo Battery', 'The operating system did not return a power-state reading.');
  }
}

async function readStorage(): Promise<Reading<StorageReading>> {
  if (Platform.OS === 'web') return readBrowserStorage(browserNavigator());
  try {
    const totalBytes = Paths.totalDiskSpace;
    const freeBytes = Paths.availableDiskSpace;
    if (!validStorage(totalBytes, freeBytes)) return unavailable('Expo File System', 'The operating system did not expose valid internal-storage capacity.');
    return measured(storageFromCapacity(totalBytes, freeBytes), 'Expo File System', 'Internal storage reported by the OS; used space is total minus available, not a per-file inventory.');
  } catch {
    return unavailable('Expo File System', 'Internal-storage capacity is unavailable in this runtime.');
  }
}

function deviceType(type: Device.DeviceType | null): string {
  switch (type) {
    case Device.DeviceType.PHONE: return 'Phone';
    case Device.DeviceType.TABLET: return 'Tablet';
    case Device.DeviceType.DESKTOP: return 'Desktop';
    case Device.DeviceType.TV: return 'Television';
    default: return 'Not reported';
  }
}

export async function getDeviceInfo(): Promise<DeviceSnapshot> {
  const [battery, storage, type] = await Promise.all([readBattery(), readStorage(), Device.getDeviceTypeAsync().catch(() => null)]);
  const dim = Dimensions.get('window');
  const web = Platform.OS === 'web';
  const nav = browserNavigator();
  let network: DeviceSnapshot['network'] = { online: null, transport: null, source: 'Not exposed', observedAt: Date.now(), note: 'Connection state is not an internet reachability test.' };
  const warnings: string[] = [];
  if (web) {
    network = { online: typeof nav?.onLine === 'boolean' ? nav.onLine : null, transport: null, source: 'Browser connection state', observedAt: Date.now(), note: 'Interface state only; internet reachability is not tested.' };
    warnings.push('Browser readings describe this browser, not the whole device. Storage is a site quota; memory is a coarse hint.');
  } else {
    try {
      const state = await Network.getNetworkStateAsync();
      const transports: Partial<Record<Network.NetworkStateType, string>> = {
        [Network.NetworkStateType.WIFI]: 'Wi-Fi', [Network.NetworkStateType.CELLULAR]: 'Cellular',
        [Network.NetworkStateType.ETHERNET]: 'Ethernet', [Network.NetworkStateType.VPN]: 'VPN',
        [Network.NetworkStateType.BLUETOOTH]: 'Bluetooth', [Network.NetworkStateType.NONE]: 'None',
      };
      network = { online: state.isConnected ?? null, transport: state.type !== undefined ? transports[state.type] ?? null : null, source: 'Expo Network', observedAt: Date.now(), note: 'OS interface state; no internet reachability probe is sent.' };
    } catch { warnings.push('Network state could not be read.'); }
  }
  const cores = web && finitePositive(nav?.hardwareConcurrency) && Number.isInteger(nav.hardwareConcurrency)
    ? measured(nav!.hardwareConcurrency!, 'navigator.hardwareConcurrency', 'Logical processors visible to the browser; not CPU utilization or frequency.')
    : unavailable<number>(web ? 'navigator.hardwareConcurrency' : 'No supported native API', 'A reliable logical-processor count is not exposed in this runtime.');
  const memory = web
    ? finitePositive(nav?.deviceMemory)
      ? estimated(nav!.deviceMemory! * 1024 ** 3, 'navigator.deviceMemory', 'A coarse, capped browser hint. Not installed RAM or current memory usage.')
      : unavailable<number>('navigator.deviceMemory', 'This browser does not expose a memory hint.')
    : finitePositive(Device.totalMemory)
      ? measured(Device.totalMemory, 'Expo Device', 'Total memory accessible to the kernel, not current app or system utilization.')
      : unavailable<number>('Expo Device', 'Physical memory capacity is not exposed on this platform.');
  if (battery.status === 'unavailable') warnings.push(`Battery charge is unavailable. ${battery.note ?? ''}`.trim());
  if (storage.status === 'unavailable') warnings.push('Storage capacity is unavailable on this platform.');
  const name = web ? browserDeviceName(nav) : Device.modelName || Device.deviceName || 'This device';
  const hermes = typeof (globalThis as { HermesInternal?: unknown }).HermesInternal !== 'undefined';
  const runtimeLabel = `${currentRuntimeLabel(Platform.OS, name, hermes)}${web ? '' : ` · ${Device.osName || Platform.OS} ${Device.osVersion || ''}`.trimEnd()}`;
  return {
    capturedAt: Date.now(), platform: web ? 'web' : Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other',
    device: {
      name, brand: web ? null : Device.brand, manufacturer: web ? null : Device.manufacturer, model: web ? null : Device.modelId,
      os: web ? osFrom(nav?.userAgentData?.platform || (/Android/.test(nav?.userAgent || '') ? 'Android' : /iPhone|iPad/.test(nav?.userAgent || '') ? 'iOS' : 'Web')) : `${Device.osName || 'Unknown OS'} ${Device.osVersion || ''}`.trim(),
      type: web ? 'Browser' : deviceType(type), isDevice: web ? false : Device.isDevice,
    },
    processor: { architecture: web ? null : Device.supportedCpuArchitectures?.join(', ') || null, cores },
    memory: { totalBytes: memory }, storage, battery,
    display: { width: dim.width, height: dim.height, scale: PixelRatio.get(), fontScale: PixelRatio.getFontScale(), isViewport: web },
    network, runtime: { label: runtimeLabel, appVersion: APP_VERSION }, warnings,
  };
}
