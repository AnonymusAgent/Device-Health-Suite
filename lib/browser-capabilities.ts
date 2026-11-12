import { normalizeBattery } from './capabilities';
import { estimated, finitePositive, measured, unavailable, type BatteryReading, type Reading, type StorageReading } from './diagnostics';

export const osFrom = (platform: string) => ({ win: 'Windows', mac: 'macOS', android: 'Android', ios: 'iOS', linux: 'Linux' }[platform.toLowerCase()] || platform || 'Unknown OS');

export interface BrowserNavigator {
  userAgent: string;
  onLine?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  userAgentData?: { platform?: string; mobile?: boolean };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
  storage?: { estimate?: () => Promise<{ quota?: number; usage?: number }> };
}
export function browserDeviceName(nav: BrowserNavigator | null): string {
  if (!nav) return 'Web browser';
  const ua = nav.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = nav.userAgentData?.platform || (/Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Linux');
  return `${browser} on ${osFrom(os)}`;
}

export async function readBrowserBattery(nav: BrowserNavigator | null): Promise<Reading<BatteryReading>> {
  if (typeof nav?.getBattery !== 'function') return unavailable('Battery Status API', 'This browser does not expose battery information. A supported browser and secure context may be required.');
  try {
    const battery = await nav.getBattery();
    const value = normalizeBattery(battery?.level, battery?.charging, null);
    if (!value) return unavailable('Battery Status API', 'The browser did not return a valid charge level.');
    return measured(value, 'Battery Status API', 'Browser-reported charge, not battery condition. The browser may round or restrict this value.');
  } catch {
    return unavailable('Battery Status API', 'Battery access was denied or is unavailable in this browsing context.');
  }
}

export async function readBrowserStorage(nav: BrowserNavigator | null): Promise<Reading<StorageReading>> {
  if (typeof nav?.storage?.estimate !== 'function') return unavailable('Storage Manager API', 'Your browser does not expose a storage estimate.');
  try {
    const { quota, usage } = await nav.storage.estimate();
    if (!finitePositive(quota) || typeof usage !== 'number' || !Number.isFinite(usage) || usage < 0 || usage > quota) return unavailable('Storage Manager API', 'No valid per-origin storage estimate was returned.');
    return estimated({ totalBytes: quota, usedBytes: usage, freeBytes: quota - usage }, 'Storage Manager API', 'Per-origin browser quota, not physical disk capacity. Usage is estimated and the quota can change.');
  } catch {
    return unavailable('Storage Manager API', 'Storage information is restricted in this browsing context.');
  }
}

