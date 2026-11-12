import type { BatteryReading, StorageReading } from './diagnostics';

/** Expo documents a default false on older Android; do not present it as an observation. */
export function supportsLowPowerMode(platform: string, osVersion: string | null | undefined): boolean {
  if (platform === 'ios') return true;
  if (platform !== 'android') return false;
  const major = Number.parseInt(osVersion ?? '', 10);
  return Number.isFinite(major) && major >= 21;
}

export function validBatteryLevel(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validStorage(total: unknown, free: unknown): total is number {
  return typeof total === 'number' && typeof free === 'number' && Number.isFinite(total) && total > 0 && Number.isFinite(free) && free >= 0 && free <= total;
}

export function storageFromCapacity(total: number, free: number): StorageReading {
  if (!validStorage(total, free)) throw new Error('Invalid storage capacity.');
  return { totalBytes: total, freeBytes: free, usedBytes: total - free };
}

export function normalizeBattery(level: unknown, charging: unknown, lowPower: unknown): BatteryReading | null {
  if (!validBatteryLevel(level)) return null;
  return { level, charging: typeof charging === 'boolean' ? charging : null, lowPower: typeof lowPower === 'boolean' ? lowPower : null };
}
