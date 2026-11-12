import { finitePositive, formatPercent, storageRatio, type DeviceSnapshot, type Reading } from './diagnostics';

export const INSIGHT_RULES = { lowBatteryCharge: 0.2, storageUsedAttention: 0.85 } as const;
export interface DiagnosticInsight {
  id: 'battery' | 'storage' | 'network' | 'power';
  title: string;
  status: 'good' | 'attention' | 'info';
  icon: 'battery' | 'storage' | 'network' | 'power';
  measured: string;
  whyItMatters: string;
  source: string;
  observedAt: number | null;
  confidence: 'Platform-reported' | 'Estimated' | 'Time not recorded';
  limitations: string;
  recommendation: string;
}

function confidence(reading: Reading<unknown>, _fallback: number): Pick<DiagnosticInsight, 'confidence' | 'observedAt'> {
  return { confidence: reading.status === 'estimated' ? 'Estimated' : reading.observedAt === undefined ? 'Time not recorded' : 'Platform-reported', observedAt: reading.observedAt ?? null };
}

/** Rules use only observed values. No aggregate score or unsupported hardware diagnosis. */
export function deriveInsights(snapshot: DeviceSnapshot | null): DiagnosticInsight[] {
  if (!snapshot) return [];
  const insights: DiagnosticInsight[] = [];
  const battery = snapshot.battery;
  const charge = battery.value;
  if (charge) {
    const low = charge.level < INSIGHT_RULES.lowBatteryCharge;
    insights.push({
      id: 'battery', icon: 'battery', status: low && charge.charging !== true ? 'attention' : low ? 'info' : 'good',
      title: low ? charge.charging ? 'Low charge, connected to power' : 'Battery could use a charge' : 'Battery charge recorded',
      measured: `${formatPercent(charge.level)} charge${charge.charging === null ? '; power connection unavailable' : charge.charging ? '; connected to power' : '; running on battery'}.`,
      whyItMatters: 'Available charge helps you plan your next session. Power modes and background load can also affect runtime.',
      source: battery.source, ...confidence(battery, snapshot.capturedAt),
      limitations: battery.note ?? 'Charge is not battery condition, capacity wear or a repair diagnosis. The platform may round or restrict the value.',
      recommendation: low ? charge.charging ? 'Leave power connected if you need a longer session. Charging speed is not measured.' : 'Connect a charger when convenient, especially before a benchmark.' : 'No action is indicated by charge alone. For repeatable benchmarks, use similar power settings between runs.',
    });
  }
  const storage = snapshot.storage;
  const capacity = storage.value;
  if (capacity && finitePositive(capacity.totalBytes)) {
    const web = snapshot.platform === 'web';
    const ratio = storageRatio(capacity);
    insights.push({
      id: 'storage', icon: 'storage', status: ratio > INSIGHT_RULES.storageUsedAttention ? 'attention' : 'good',
      title: ratio > INSIGHT_RULES.storageUsedAttention ? web ? 'Site quota is getting full' : 'Reported free space is limited' : 'Storage headroom recorded',
      measured: `${formatPercent(1 - ratio)} ${web ? 'of this site’s storage quota' : 'of reported internal storage'} is free.`,
      whyItMatters: web ? 'Site storage headroom affects whether Veylo can save reports in this browser.' : 'Free internal space affects downloads, updates and the ability to save new data.',
      source: storage.source, ...confidence(storage, snapshot.capturedAt),
      limitations: web ? 'Per-origin browser quota, not your physical disk. The browser estimates usage and may change the quota.' : 'Internal storage reported by the OS. Used space is total minus available; reserved space and other volumes are not itemized.',
      recommendation: ratio > INSIGHT_RULES.storageUsedAttention ? web ? 'Export reports you want to keep, then remove unneeded site data in browser settings. This is not your physical disk.' : 'Review files in your operating system’s storage settings. Keep enough room for exports and updates.' : 'Keep useful exports outside the app if you need a backup. Veylo retains only the latest 50 reports.',
    });
  }
  if (snapshot.network.online !== null) {
    const online = snapshot.network.online;
    insights.push({
      id: 'network', icon: 'network', status: 'info', title: online ? 'A network connection is reported' : 'No network connection is reported',
      measured: `${online ? 'Connected' : 'Offline'}${snapshot.network.transport ? ` · ${snapshot.network.transport}` : ''}. This is interface state, not an internet reachability test.`,
      whyItMatters: 'Connection state helps explain why an optional store request might not complete. Local diagnostics do not need internet access.',
      source: snapshot.network.source, observedAt: snapshot.network.observedAt ?? null,
      confidence: snapshot.network.observedAt === undefined ? 'Time not recorded' : 'Platform-reported',
      limitations: 'A connected interface does not guarantee DNS, internet access or access to a particular service. No reachability probe is sent.',
      recommendation: online ? 'If an online feature fails, check the service and your browser or OS network settings.' : 'Check Wi-Fi, Ethernet or cellular settings if you need an online feature. Snapshots and benchmarks still work locally.',
    });
  }
  if (charge?.lowPower === true) insights.push({
    id: 'power', icon: 'power', status: 'info', title: 'Low-power mode is enabled',
    measured: 'The operating system reports low-power mode is on.',
    whyItMatters: 'Power-saving settings can change scheduling and benchmark throughput.',
    source: battery.source, ...confidence(battery, snapshot.capturedAt),
    limitations: 'This is a power setting, not a measurement of battery condition or energy consumption.',
    recommendation: 'For a fair comparison, keep power settings consistent. Leave low-power mode on if battery conservation is your priority.',
  });
  return insights;
}
