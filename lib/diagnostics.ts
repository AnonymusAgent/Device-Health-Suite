export type ReadingStatus = 'measured' | 'estimated' | 'unavailable';
export interface Reading<T> {
  value: T | null;
  status: ReadingStatus;
  source: string;
  note?: string;
}
export const unavailable = <T>(source: string, note?: string): Reading<T> => ({ value: null, status: 'unavailable', source, ...(note ? { note } : {}) });
export const measured = <T>(value: T, source: string): Reading<T> => ({ value, status: 'measured', source });
export const estimated = <T>(value: T, source: string, note: string): Reading<T> => ({ value, status: 'estimated', source, note });
export const finitePositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export interface BatteryReading {
  level: number;
  charging: boolean | null;
  lowPower: boolean | null;
}
export interface StorageReading { totalBytes: number; usedBytes: number; freeBytes: number }
export interface DeviceSnapshot {
  capturedAt: number;
  platform: 'web' | 'ios' | 'android' | 'other';
  device: { name: string; brand: string | null; manufacturer: string | null; model: string | null; os: string; type: string; isDevice: boolean };
  processor: { architecture: string | null; cores: Reading<number> };
  memory: { totalBytes: Reading<number> };
  storage: Reading<StorageReading>;
  battery: Reading<BatteryReading>;
  display: { width: number; height: number; scale: number; fontScale: number; isViewport: boolean };
  network: { online: boolean | null; transport: string | null; source: string };
  warnings: string[];
}
export interface HealthCheck {
  id: string;
  title: string;
  description: string;
  status: 'good' | 'attention' | 'info';
  icon: 'battery' | 'storage' | 'network' | 'power';
}

export function deriveChecks(snapshot: DeviceSnapshot | null): HealthCheck[] {
  if (!snapshot) return [];
  const checks: HealthCheck[] = [];
  const battery = snapshot.battery.value;
  if (battery) checks.push({
    id: 'battery', title: battery.level < 0.2 ? 'Battery could use a charge' : 'Battery level is comfortable',
    description: battery.level < 0.2 ? 'Connect a charger when you can. Charge level is not battery health.' : `${formatPercent(battery.level)} remaining${battery.charging ? ' and connected to power' : ''}. Battery wear is not exposed.`,
    status: battery.level < 0.2 ? 'attention' : 'good', icon: 'battery',
  });
  const storage = snapshot.storage.value;
  if (storage && finitePositive(storage.totalBytes)) {
    const ratio = storageRatio(storage);
    const web = snapshot.platform === 'web';
    checks.push({ id: 'storage', title: ratio > 0.85 ? 'Storage is getting full' : 'Room for what comes next',
      description: `${formatPercent(1 - ratio)} ${web ? 'of this site’s storage quota' : 'of reported disk space'} is free.${web ? ' This is not your physical disk.' : ''}`,
      status: ratio > 0.85 ? 'attention' : 'good', icon: 'storage' });
  }
  if (snapshot.network.online !== null) checks.push({ id: 'network', title: snapshot.network.online ? 'Your device is connected' : 'You’re currently offline',
    description: snapshot.platform === 'web' ? 'Browser connection state. Internet reachability is not guaranteed.' : 'Reported by the operating system. No location permission needed.',
    status: snapshot.network.online ? 'good' : 'attention', icon: 'network' });
  if (battery?.lowPower) checks.push({ id: 'power', title: 'Low-power mode is on', description: 'Your device is conserving energy. Performance may be reduced.', status: 'info', icon: 'power' });
  return checks;
}
export function storageRatio(storage: StorageReading): number {
  return finitePositive(storage.totalBytes) ? Math.max(0, Math.min(1, storage.usedBytes / storage.totalBytes)) : 0;
}
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes === 0) return '0 B';
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${Number((bytes / 1024 ** index).toFixed(decimals))} ${['B', 'KB', 'MB', 'GB', 'TB'][index]}`;
}
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'Unavailable' : `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
export function snapshotRows(snapshot: DeviceSnapshot): { label: string; value: string; source: string }[] {
  const s = snapshot;
  return [
    { label: 'Device', value: s.device.name, source: s.platform === 'web' ? 'Browser / operating system' : 'Expo Device' },
    { label: 'Platform', value: s.device.os, source: 'Operating system' },
    { label: 'Manufacturer', value: s.device.manufacturer || 'Not exposed', source: 'Expo Device' },
    { label: 'Model identifier', value: s.device.model || 'Not exposed', source: 'Expo Device' },
    { label: 'Device type', value: s.device.type, source: 'Expo Device' },
    { label: 'Architecture', value: s.processor.architecture || 'Not exposed', source: 'Expo Device' },
    { label: 'Logical processors', value: s.processor.cores.value === null ? 'Not exposed' : String(s.processor.cores.value), source: s.processor.cores.source },
    { label: 'Device memory', value: formatBytes(s.memory.totalBytes.value), source: s.memory.totalBytes.source },
    { label: s.platform === 'web' ? 'Site storage quota' : 'Total disk space', value: formatBytes(s.storage.value?.totalBytes), source: s.storage.source },
    { label: s.platform === 'web' ? 'Site storage used' : 'Disk space used', value: formatBytes(s.storage.value?.usedBytes), source: s.storage.source },
    { label: 'Available storage', value: formatBytes(s.storage.value?.freeBytes), source: s.storage.source },
    { label: 'Battery charge', value: formatPercent(s.battery.value?.level), source: s.battery.source },
    { label: 'Power connection', value: s.battery.value?.charging == null ? 'Not exposed' : s.battery.value.charging ? 'Connected' : 'On battery', source: s.battery.source },
    { label: 'Low-power mode', value: s.battery.value?.lowPower == null ? 'Not exposed' : s.battery.value.lowPower ? 'On' : 'Off', source: s.battery.source },
    { label: s.display.isViewport ? 'Viewport (logical pixels)' : 'Window (logical pixels)', value: `${Math.round(s.display.width)} × ${Math.round(s.display.height)}`, source: 'React Native Dimensions' },
    { label: 'Pixel ratio', value: `${s.display.scale}×`, source: 'React Native PixelRatio' },
    { label: 'Font scale', value: `${s.display.fontScale}×`, source: 'React Native PixelRatio' },
    { label: 'Connection', value: s.network.online === null ? 'Not exposed' : s.network.online ? 'Connected' : 'Offline', source: s.network.source },
    { label: 'Network transport', value: s.network.transport || 'Not exposed', source: s.network.source },
    { label: 'CPU utilization / clock', value: 'Not exposed', source: 'No supported platform API' },
    { label: 'RAM utilization / temperature', value: 'Not exposed', source: 'No supported platform API' },
  ];
}
