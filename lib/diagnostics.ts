import { deriveInsights } from './insights';
import { APP_VERSION } from './app-meta';

export type ReadingStatus = 'measured' | 'estimated' | 'unavailable';
export interface Reading<T> {
  value: T | null;
  status: ReadingStatus;
  source: string;
  note?: string;
  /** Time of the platform response, not the time a screen started requesting it. */
  observedAt?: number;
}
export const unavailable = <T>(source: string, note?: string): Reading<T> => ({
  value: null, status: 'unavailable', source, ...(note ? { note } : {}), observedAt: Date.now(),
});
export const measured = <T>(value: T, source: string, note?: string): Reading<T> => ({
  value, status: 'measured', source, ...(note ? { note } : {}), observedAt: Date.now(),
});
export const estimated = <T>(value: T, source: string, note: string): Reading<T> => ({
  value, status: 'estimated', source, note, observedAt: Date.now(),
});
export const finitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

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
  network: { online: boolean | null; transport: string | null; source: string; observedAt?: number; note?: string };
  runtime?: { label: string; appVersion: string };
  warnings: string[];
}
export interface HealthCheck {
  id: string;
  title: string;
  description: string;
  status: 'good' | 'attention' | 'info';
  icon: 'battery' | 'storage' | 'network' | 'power';
}

/** Compatibility facade; the transparent rule model lives in insights.ts. */
export function deriveChecks(snapshot: DeviceSnapshot | null): HealthCheck[] {
  return deriveInsights(snapshot).map(({ id, title, status, icon, measured: evidence, recommendation }) => ({
    id, title, status, icon, description: `${evidence} ${recommendation}`,
  }));
}
export function storageRatio(storage: StorageReading): number {
  return finitePositive(storage.totalBytes) ? Math.max(0, Math.min(1, storage.usedBytes / storage.totalBytes)) : 0;
}
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes === 0) return '0 B';
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 5);
  return `${Number((bytes / 1024 ** index).toFixed(decimals))} ${['B', 'KB', 'MB', 'GB', 'TB', 'PB'][index]}`;
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
export function formatTimestamp(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined || !Number.isFinite(timestamp)) return 'Not recorded';
  return `${formatDate(timestamp)}, ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export interface MeasurementGuide { explanation: string; whyItMatters: string; limitation: string }
export const MEASUREMENT_GUIDES = {
  identity: { explanation: 'Identity reported by the platform or inferred from the browser name.', whyItMatters: 'Keep the same device and runtime when comparing historical results.', limitation: 'A browser or simulator does not identify the underlying physical hardware.' },
  processors: { explanation: 'Logical processors exposed to the browser, when available.', whyItMatters: 'This describes the runtime environment; Veylo’s compute check uses one JavaScript thread.', limitation: 'Not CPU utilization, clock frequency or a native multi-core measurement.' },
  memory: { explanation: 'Reported physical memory on native devices, or a coarse browser memory hint.', whyItMatters: 'It provides context for app-level checks, not a diagnosis of memory pressure.', limitation: 'System RAM utilization is unavailable. Browser hints are approximate and capped.' },
  storage: { explanation: 'Native internal-storage capacity or the browser’s per-origin storage estimate.', whyItMatters: 'Headroom affects whether new reports and exports can be saved.', limitation: 'Browser quota is not physical disk capacity. Native used space is derived as total minus available.' },
  battery: { explanation: 'Charge and power state returned by a supported platform API.', whyItMatters: 'Charge and power settings provide context for session length and benchmark conditions.', limitation: 'Charge is not battery condition or wear. Values may be rounded, restricted or unavailable.' },
  display: { explanation: 'The current app window or browser viewport in logical pixels.', whyItMatters: 'Layout and font scaling affect readability and the space available for charts.', limitation: 'This is not the physical panel resolution or a display-quality test.' },
  network: { explanation: 'The platform’s current network-interface state.', whyItMatters: 'It helps explain optional online features without sending a reachability probe.', limitation: 'Connectivity does not guarantee internet access, DNS resolution or a working service.' },
  unsupported: { explanation: 'The supported cross-platform APIs do not expose this measurement.', whyItMatters: 'An explicit gap is more useful than a plausible-looking invented number.', limitation: 'Unavailable. Veylo does not substitute an estimate, simulation or hardware-health verdict.' },
} satisfies Record<string, MeasurementGuide>;

export interface SnapshotRow extends MeasurementGuide {
  id: string;
  label: string;
  value: string;
  source: string;
  status: ReadingStatus;
  observedAt?: number;
  note?: string;
  category: 'Identity' | 'Compute' | 'Memory' | 'Storage' | 'Power' | 'Display' | 'Network' | 'Unavailable';
}

export function snapshotRows(snapshot: DeviceSnapshot): SnapshotRow[] {
  const s = snapshot;
  const web = s.platform === 'web';
  const metadata = (id: string, label: string, value: string | null, source: string, guide: MeasurementGuide, category: SnapshotRow['category']): SnapshotRow => ({
    id, label, value: value || 'Unavailable', source, status: value ? web && category === 'Identity' ? 'estimated' : 'measured' : 'unavailable',
    observedAt: s.capturedAt, ...guide, category,
  });
  const fromReading = <T>(id: string, label: string, reading: Reading<T>, format: (value: T) => string, guide: MeasurementGuide, category: SnapshotRow['category']): SnapshotRow => ({
    id, label, value: reading.value === null ? 'Unavailable' : format(reading.value), source: reading.source,
    status: reading.value !== null && format(reading.value) === 'Unavailable' ? 'unavailable' : reading.status,
    ...(reading.observedAt === undefined ? {} : { observedAt: reading.observedAt }), note: reading.note ?? guide.limitation, ...guide, category,
  });
  const unsupported = (id: string, label: string, category: SnapshotRow['category']): SnapshotRow => ({
    id, label, value: 'Unavailable', source: 'No supported platform API', status: 'unavailable', observedAt: s.capturedAt,
    ...MEASUREMENT_GUIDES.unsupported, category,
  });
  const rows: SnapshotRow[] = [
    metadata('device', 'Device', s.device.name, web ? 'Browser / operating system' : 'Expo Device', MEASUREMENT_GUIDES.identity, 'Identity'),
    metadata('platform', 'Platform', s.device.os, 'Operating system', MEASUREMENT_GUIDES.identity, 'Identity'),
    metadata('manufacturer', 'Manufacturer', s.device.manufacturer, 'Expo Device', MEASUREMENT_GUIDES.identity, 'Identity'),
    metadata('model', 'Model identifier', s.device.model, 'Expo Device', MEASUREMENT_GUIDES.identity, 'Identity'),
    metadata('type', 'Device type', s.device.type, 'Expo Device', MEASUREMENT_GUIDES.identity, 'Identity'),
    metadata('architecture', 'Supported CPU architectures', s.processor.architecture, 'Expo Device', MEASUREMENT_GUIDES.processors, 'Compute'),
    fromReading('cores', 'Logical processors', s.processor.cores, String, MEASUREMENT_GUIDES.processors, 'Compute'),
    fromReading('memory', web ? 'Browser memory hint' : 'Device memory', s.memory.totalBytes, formatBytes, MEASUREMENT_GUIDES.memory, 'Memory'),
    fromReading('storage-total', web ? 'Site storage quota' : 'Total internal storage', s.storage, v => formatBytes(v.totalBytes), MEASUREMENT_GUIDES.storage, 'Storage'),
    fromReading('storage-used', web ? 'Site storage used' : 'Internal storage used (derived)', s.storage, v => formatBytes(v.usedBytes), MEASUREMENT_GUIDES.storage, 'Storage'),
    fromReading('storage-free', web ? 'Site quota available' : 'Internal storage available', s.storage, v => formatBytes(v.freeBytes), MEASUREMENT_GUIDES.storage, 'Storage'),
    fromReading('battery', 'Battery charge', s.battery, v => formatPercent(v.level), MEASUREMENT_GUIDES.battery, 'Power'),
    fromReading('charging', 'Power connection', s.battery, v => v.charging === null ? 'Unavailable' : v.charging ? 'Connected' : 'On battery', MEASUREMENT_GUIDES.battery, 'Power'),
    fromReading('low-power', 'Low-power mode', s.battery, v => v.lowPower === null ? 'Unavailable' : v.lowPower ? 'On' : 'Off', MEASUREMENT_GUIDES.battery, 'Power'),
    metadata('window', s.display.isViewport ? 'Viewport (logical pixels)' : 'App window (logical pixels)', `${Math.round(s.display.width)} × ${Math.round(s.display.height)}`, 'React Native Dimensions', MEASUREMENT_GUIDES.display, 'Display'),
    metadata('pixel-ratio', 'Pixel ratio', `${s.display.scale}×`, 'React Native PixelRatio', MEASUREMENT_GUIDES.display, 'Display'),
    metadata('font-scale', 'Font scale', `${s.display.fontScale}×`, 'React Native PixelRatio', MEASUREMENT_GUIDES.display, 'Display'),
    { id: 'network', label: 'Connection', value: s.network.online === null ? 'Unavailable' : s.network.online ? 'Connected' : 'Offline', source: s.network.source, status: s.network.online === null ? 'unavailable' : 'measured', observedAt: s.network.observedAt, note: s.network.note ?? MEASUREMENT_GUIDES.network.limitation, ...MEASUREMENT_GUIDES.network, category: 'Network' },
    metadata('transport', 'Network transport', s.network.transport, s.network.source, MEASUREMENT_GUIDES.network, 'Network'),
    unsupported('cpu-utilization', 'CPU utilization', 'Compute'),
    unsupported('cpu-frequency', 'CPU frequency', 'Compute'),
    unsupported('ram-utilization', 'System RAM utilization', 'Memory'),
    unsupported('temperature', 'CPU / device temperature', 'Compute'),
    unsupported('battery-condition', 'Battery condition / wear', 'Power'),
  ];
  return rows;
}

export function currentRuntimeLabel(platform: string, deviceName: string, hermes: boolean): string {
  return `${platform === 'web' ? deviceName : `Expo ${platform}`} · ${hermes ? 'Hermes' : 'JS engine not exposed'} · Veylo ${APP_VERSION}`;
}
