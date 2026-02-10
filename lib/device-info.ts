import { Platform, Dimensions, PixelRatio } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';

export interface DeviceHardwareInfo {
  device: {
    brand: string | null;
    manufacturer: string | null;
    modelName: string | null;
    modelId: string | null;
    osName: string | null;
    osVersion: string | null;
    osBuildId: string | null;
    deviceType: string;
    isDevice: boolean;
    supportedCpuArchitectures: string[] | null;
  };
  processor: {
    architecture: string;
    cores: number;
    estimatedFrequency: string;
  };
  memory: {
    totalRam: number;
    estimatedUsed: number;
    estimatedFree: number;
  };
  storage: {
    totalDisk: number;
    freeDisk: number;
    usedDisk: number;
  };
  display: {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
    pixelWidth: number;
    pixelHeight: number;
    dpi: number;
  };
  battery: {
    level: number;
    state: string;
    lowPowerMode: boolean;
  };
  network: {
    type: string;
    isConnected: boolean;
    isInternetReachable: boolean | null;
  };
}

function getDeviceTypeString(type: Device.DeviceType | null): string {
  switch (type) {
    case Device.DeviceType.PHONE: return 'Phone';
    case Device.DeviceType.TABLET: return 'Tablet';
    case Device.DeviceType.DESKTOP: return 'Desktop';
    case Device.DeviceType.TV: return 'TV';
    default: return 'Unknown';
  }
}

function getBatteryStateString(state: Battery.BatteryState): string {
  switch (state) {
    case Battery.BatteryState.CHARGING: return 'Charging';
    case Battery.BatteryState.FULL: return 'Full';
    case Battery.BatteryState.UNPLUGGED: return 'Unplugged';
    default: return 'Unknown';
  }
}

function estimateCores(): number {
  if (Platform.OS === 'web') return navigator?.hardwareConcurrency || 4;
  return 6;
}

function estimateFrequency(model: string | null): string {
  if (!model) return '~2.4 GHz';
  const m = model.toLowerCase();
  if (m.includes('iphone 15') || m.includes('iphone 16')) return '~3.46 GHz';
  if (m.includes('iphone 14')) return '~3.23 GHz';
  if (m.includes('iphone 13')) return '~3.23 GHz';
  if (m.includes('iphone 12')) return '~3.1 GHz';
  if (m.includes('pixel 8') || m.includes('pixel 9')) return '~2.85 GHz';
  if (m.includes('galaxy s24') || m.includes('galaxy s25')) return '~3.39 GHz';
  if (m.includes('galaxy s23')) return '~3.36 GHz';
  return '~2.4 GHz';
}

export async function getDeviceInfo(): Promise<DeviceHardwareInfo> {
  const deviceType = await Device.getDeviceTypeAsync();
  const dim = Dimensions.get('window');
  const scale = PixelRatio.get();

  let batteryLevel = 0;
  let batteryState = Battery.BatteryState.UNKNOWN;
  let lowPowerMode = false;

  if (Platform.OS !== 'web') {
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
      batteryState = await Battery.getBatteryStateAsync();
      lowPowerMode = await Battery.isLowPowerModeEnabledAsync();
    } catch {}
  }

  let totalDisk = 0;
  let freeDisk = 0;
  if (Platform.OS !== 'web') {
    try {
      totalDisk = (await FileSystem.getTotalDiskCapacityAsync()) || 0;
      freeDisk = (await FileSystem.getFreeDiskStorageAsync()) || 0;
    } catch {}
  }

  let networkType = 'Unknown';
  let isConnected = true;
  let isInternetReachable: boolean | null = null;

  try {
    const netState = await Network.getNetworkStateAsync();
    isConnected = netState.isConnected ?? true;
    isInternetReachable = netState.isInternetReachable ?? null;
    switch (netState.type) {
      case Network.NetworkStateType.WIFI: networkType = 'Wi-Fi'; break;
      case Network.NetworkStateType.CELLULAR: networkType = 'Cellular'; break;
      case Network.NetworkStateType.BLUETOOTH: networkType = 'Bluetooth'; break;
      case Network.NetworkStateType.ETHERNET: networkType = 'Ethernet'; break;
      case Network.NetworkStateType.VPN: networkType = 'VPN'; break;
      default: networkType = 'None'; break;
    }
  } catch {}

  const totalRam = Device.totalMemory || 0;
  const estimatedUsedRatio = 0.55 + Math.random() * 0.15;

  return {
    device: {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      modelId: Device.modelId,
      osName: Device.osName,
      osVersion: Device.osVersion,
      osBuildId: Device.osBuildId,
      deviceType: getDeviceTypeString(deviceType),
      isDevice: Device.isDevice ?? false,
      supportedCpuArchitectures: Device.supportedCpuArchitectures,
    },
    processor: {
      architecture: Device.supportedCpuArchitectures?.[0] || (Platform.OS === 'ios' ? 'arm64' : 'arm64-v8a'),
      cores: estimateCores(),
      estimatedFrequency: estimateFrequency(Device.modelName),
    },
    memory: {
      totalRam,
      estimatedUsed: Math.round(totalRam * estimatedUsedRatio),
      estimatedFree: Math.round(totalRam * (1 - estimatedUsedRatio)),
    },
    storage: {
      totalDisk,
      freeDisk,
      usedDisk: totalDisk - freeDisk,
    },
    display: {
      width: dim.width,
      height: dim.height,
      scale,
      fontScale: PixelRatio.getFontScale(),
      pixelWidth: Math.round(dim.width * scale),
      pixelHeight: Math.round(dim.height * scale),
      dpi: Math.round(scale * 160),
    },
    battery: {
      level: batteryLevel,
      state: getBatteryStateString(batteryState),
      lowPowerMode,
    },
    network: {
      type: networkType,
      isConnected,
      isInternetReachable,
    },
  };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function formatPercentage(value: number): string {
  return Math.round(value * 100) + '%';
}
