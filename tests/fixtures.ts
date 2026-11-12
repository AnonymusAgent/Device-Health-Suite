import { unavailable, type DeviceSnapshot } from '../lib/diagnostics';

export const snapshot = (overrides: Partial<DeviceSnapshot> = {}): DeviceSnapshot => ({
  capturedAt: 1762905600000, platform: 'web', device: { name: 'Chrome on Windows', brand: null, manufacturer: null, model: null, os: 'Windows', type: 'Browser', isDevice: false },
  processor: { architecture: null, cores: { value: 8, status: 'measured', source: 'test' } },
  memory: { totalBytes: { value: 8 * 1024 ** 3, status: 'estimated', source: 'test', note: 'Coarse hint', observedAt: 1762905600000 } },
  storage: { value: { totalBytes: 1000, usedBytes: 200, freeBytes: 800 }, status: 'estimated', source: 'test', observedAt: 1762905600000 },
  display: { width: 1440, height: 900, scale: 1, fontScale: 1, isViewport: true },
  battery: unavailable('test'), network: { online: true, transport: null, source: 'test', observedAt: 1762905600000 }, warnings: [], ...overrides,
});
