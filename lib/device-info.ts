import { Dimensions, PixelRatio, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import { Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { estimated, finitePositive, measured, unavailable, type BatteryReading, type DeviceSnapshot, type Reading, type StorageReading } from './diagnostics';

type BrowserNavigator = Omit<Navigator, 'storage'> & {
  deviceMemory?: number;
  userAgentData?: { platform?: string; mobile?: boolean };
  connection?: { effectiveType?: string; type?: string };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
  storage?: { estimate?: () => Promise<{ quota?: number; usage?: number }> };
};
const browserNavigator = () => typeof navigator !== 'undefined' ? navigator as BrowserNavigator : null;
const osFrom = (platform: string) => ({ win: 'Windows', mac: 'macOS', android: 'Android', ios: 'iOS', linux: 'Linux' }[platform.toLowerCase()] || platform || 'Unknown OS');

export function browserDeviceName(nav: BrowserNavigator | null): string {
  if (!nav) return 'Web browser';
  const ua = nav.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${browser} on ${osFrom(nav.userAgentData?.platform || (/Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Linux'))}`;
}
export async function readBattery(): Promise<Reading<BatteryReading>> {
  if (Platform.OS === 'web') {
    const nav = browserNavigator();
    if (!nav?.getBattery) return unavailable('Battery Status API', 'This browser does not expose battery information. Try a supported browser over HTTPS.');
    try {
      const battery = await nav.getBattery();
      if (!Number.isFinite(battery.level) || battery.level < 0 || battery.level > 1) return unavailable('Battery Status API');
      return measured({ level: battery.level, charging: typeof battery.charging === 'boolean' ? battery.charging : null, lowPower: null }, 'Battery Status API');
    } catch { return unavailable('Battery Status API', 'Battery access was denied or is unavailable in this context.'); }
  }
  try {
    const power = await Battery.getPowerStateAsync();
    if (!Number.isFinite(power.batteryLevel) || power.batteryLevel < 0 || power.batteryLevel > 1) return unavailable('Expo Battery', 'No battery reading is available on this device or simulator.');
    return measured({ level: power.batteryLevel,
      charging: power.batteryState === Battery.BatteryState.CHARGING || power.batteryState === Battery.BatteryState.FULL ? true : power.batteryState === Battery.BatteryState.UNPLUGGED ? false : null,
      lowPower: typeof power.lowPowerMode === 'boolean' ? power.lowPowerMode : null,
    }, 'Expo Battery');
  } catch { return unavailable('Expo Battery', 'The operating system did not return a power-state reading.'); }
}
async function readStorage(): Promise<Reading<StorageReading>> {
  if (Platform.OS === 'web') {
    const nav = browserNavigator();
    if (!nav?.storage?.estimate) return unavailable('Storage Manager API', 'Your browser does not expose a storage estimate.');
    try {
      const { quota, usage } = await nav.storage.estimate();
      if (!finitePositive(quota) || usage === undefined || !Number.isFinite(usage) || usage < 0 || usage > quota) return unavailable('Storage Manager API');
      return estimated({ totalBytes: quota, usedBytes: usage, freeBytes: quota - usage }, 'Storage Manager API', 'Per-origin browser quota, not physical disk capacity. The quota can change.');
    } catch { return unavailable('Storage Manager API', 'Storage information is restricted in this browsing context.'); }
  }
  try {
    const totalBytes = Paths.totalDiskSpace;
    const freeBytes = Paths.availableDiskSpace;
    if (!finitePositive(totalBytes) || !Number.isFinite(freeBytes) || freeBytes < 0 || freeBytes > totalBytes) return unavailable('Expo File System');
    return measured({ totalBytes, freeBytes, usedBytes: totalBytes - freeBytes }, 'Expo File System');
  } catch { return unavailable('Expo File System'); }
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
  const [battery, storage, type] = await Promise.all([
    readBattery(), readStorage(), Device.getDeviceTypeAsync().catch(() => null),
  ]);
  const dim = Dimensions.get('window');
  const web = Platform.OS === 'web';
  const nav = browserNavigator();
  let network: DeviceSnapshot['network'] = { online: null, transport: null, source: 'Not exposed' };
  const warnings: string[] = [];
  if (web) {
    network = { online: typeof nav?.onLine === 'boolean' ? nav.onLine : null, transport: null, source: 'Browser connection state' };
    warnings.push('Browser readings describe this browser, not the whole device. Storage is a site quota; memory is a coarse browser estimate.');
    if (battery.status === 'unavailable') warnings.push('Battery information is not exposed by this browser.');
  } else {
    try {
      const state = await Network.getNetworkStateAsync();
      const transports: Partial<Record<Network.NetworkStateType, string>> = {
        [Network.NetworkStateType.WIFI]: 'Wi-Fi', [Network.NetworkStateType.CELLULAR]: 'Cellular',
        [Network.NetworkStateType.ETHERNET]: 'Ethernet', [Network.NetworkStateType.VPN]: 'VPN',
        [Network.NetworkStateType.BLUETOOTH]: 'Bluetooth', [Network.NetworkStateType.NONE]: 'None',
      };
      network = { online: state.isConnected ?? null, transport: state.type !== undefined ? transports[state.type] ?? null : null, source: 'Expo Network' };
    } catch { warnings.push('Network state could not be read.'); }
  }
  const cores = web && finitePositive(nav?.hardwareConcurrency) ? measured(nav!.hardwareConcurrency!, 'navigator.hardwareConcurrency') : unavailable<number>('Platform API', 'The native runtime does not expose a reliable core count.');
  const memory = web
    ? finitePositive(nav?.deviceMemory)
      ? estimated(nav!.deviceMemory! * 1024 ** 3, 'navigator.deviceMemory', 'A coarse, capped browser hint. Not installed RAM or current memory usage.')
      : unavailable<number>('navigator.deviceMemory', 'This browser does not expose a memory hint.')
    : finitePositive(Device.totalMemory)
      ? measured(Device.totalMemory, 'Expo Device')
      : unavailable<number>('Expo Device');
  if (battery.status === 'unavailable' && !web) warnings.push('Battery charge is unavailable on this device or simulator.');
  if (storage.status === 'unavailable') warnings.push('Storage capacity is unavailable on this platform.');
  return {
    capturedAt: Date.now(), platform: web ? 'web' : Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other',
    device: { name: web ? browserDeviceName(nav) : Device.modelName || Device.deviceName || 'This device',
      brand: web ? null : Device.brand, manufacturer: web ? null : Device.manufacturer, model: web ? null : Device.modelId,
      os: web ? osFrom(nav?.userAgentData?.platform || (/Android/.test(nav?.userAgent || '') ? 'Android' : /iPhone|iPad/.test(nav?.userAgent || '') ? 'iOS' : 'Web')) : `${Device.osName || 'Unknown OS'} ${Device.osVersion || ''}`.trim(),
      type: web ? 'Browser' : deviceType(type), isDevice: web ? false : Device.isDevice },
    processor: { architecture: web ? null : Device.supportedCpuArchitectures?.join(', ') || null, cores },
    memory: { totalBytes: memory }, storage, battery,
    display: { width: dim.width, height: dim.height, scale: PixelRatio.get(), fontScale: PixelRatio.getFontScale(), isViewport: web },
    network, warnings,
  };
}
