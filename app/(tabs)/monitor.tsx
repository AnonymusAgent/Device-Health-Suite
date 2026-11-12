import React, { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSession } from '@/contexts/SessionContext';
import { useSettings, useColors } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, ConfirmDialog, IconTile, Notice, Page, PageHeader, SectionHeading, SegmentedControl, Text } from '@/components/ui';
import { SessionChart } from '@/components/SessionChart';
import { exportDate, exportText } from '@/lib/export';

export default function ActivityScreen() {
  const c = useColors();
  const { history, live, setLive, snapshot, clearSession } = useSession();
  const { preferences, updatePreferences } = useSettings();
  const { show } = useToast();
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<'frameRate' | 'batteryLevel'>('frameRate');
  const [minutes, setMinutes] = useState(5);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exporting, setExporting] = useState(false);
  const values = useMemo(() => history.filter(sample => sample.timestamp >= (history.at(-1)?.timestamp ?? Date.now()) - minutes * 60000).flatMap(sample => sample[metric] === null ? [] : [sample[metric]!]), [history, metric, minutes]);
  const latest = values.at(-1);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const unit = metric === 'frameRate' ? 'fps' : '%';
  const exportSession = async () => {
    setExporting(true);
    try {
      const csv = 'timestamp,app_js_frame_rate_fps,battery_percent\r\n' + history.map(sample => `${new Date(sample.timestamp).toISOString()},${sample.frameRate?.toFixed(2) ?? ''},${sample.batteryLevel?.toFixed(2) ?? ''}`).join('\r\n');
      const result = await exportText(`veylo-session-${exportDate()}.csv`, csv, 'text/csv');
      show(result === 'downloaded' ? 'Session CSV download started.' : 'Share sheet opened. Unavailable readings are left blank.');
    } catch (error) { show(error instanceof Error ? error.message : 'Could not export this session.', true); }
    finally { setExporting(false); }
  };
  return <Page>
    <PageHeader title="Activity" subtitle="A live window into the readings your device is sharing." actions={<><Button label="Export session" icon="download-outline" variant="secondary" disabled={!history.length} loading={exporting} onPress={() => { void exportSession(); }} small /><Button label={live ? 'Pause session' : 'Resume session'} icon={live ? 'pause-outline' : 'play-outline'} onPress={() => setLive(!live)} small /></>} />
    <View style={{ flexDirection: width > 850 ? 'row' : 'column', gap: 15, marginBottom: 22 }}>
      {[{ label: 'Latest frame cadence', value: history.at(-1)?.frameRate, unit: 'fps', icon: 'pulse-outline' as const, note: 'App JavaScript thread' }, { label: 'Average frame cadence', value: average !== null && metric === 'frameRate' ? average : history.filter(s => s.frameRate !== null).length ? history.reduce((sum, s) => sum + (s.frameRate ?? 0), 0) / history.filter(s => s.frameRate !== null).length : null, unit: 'fps', icon: 'analytics-outline' as const, note: 'Since this session began' }, { label: 'Battery charge', value: snapshot?.battery.value?.level !== undefined && snapshot?.battery.value?.level !== null ? snapshot.battery.value.level * 100 : null, unit: '%', icon: 'battery-half-outline' as const, note: snapshot?.battery.value ? 'Device reading' : 'Not exposed on this platform' }].map(item => <Card key={item.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15 }}><IconTile icon={item.icon} tone={item.icon === 'battery-half-outline' ? 'info' : 'good'} size={43} /><View style={{ gap: 5, flex: 1 }}><Text style={{ fontSize: 11, color: c.textSecondary }}>{item.label}</Text><Text style={{ fontSize: 27, fontWeight: '700', letterSpacing: -0.7 }}>{item.value === null || item.value === undefined ? '—' : item.value.toFixed(1)}<Text style={{ fontSize: 13, color: c.textSecondary, fontWeight: '400' }}> {item.value !== null && item.value !== undefined ? item.unit : ''}</Text></Text><Text style={{ fontSize: 10, color: c.textTertiary }}>{item.note}</Text></View></Card>)}
    </View>
    <Card style={{ marginBottom: 22 }}>
      <SectionHeading title="Your session, in context" subtitle="Measured samples. No synthetic history." action={<Badge tone={live ? 'good' : 'neutral'} dot>{live ? 'Collecting' : 'Paused'}</Badge>} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}><SegmentedControl label="Activity metric" options={[{ value: 'frameRate', label: 'Frame cadence' }, { value: 'batteryLevel', label: 'Battery charge' }]} value={metric} onChange={setMetric} /><SegmentedControl label="Chart time window" options={[{ value: 1, label: '1 min' }, { value: 5, label: '5 min' }, { value: 15, label: '15 min' }]} value={minutes} onChange={setMinutes} /></View>
      <SessionChart samples={history} metric={metric} windowMs={minutes * 60000} height={260} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderColor: c.border, paddingTop: 18, marginTop: 16 }}><Text style={{ fontSize: 11, color: c.textSecondary }}>{values.length} samples in this window</Text><Text style={{ fontSize: 11, color: c.textSecondary }}>Average: {average === null ? '—' : `${average.toFixed(1)} ${unit}`} · Latest: {latest === undefined ? '—' : `${latest.toFixed(1)} ${unit}`}</Text></View>
    </Card>
    <View style={{ flexDirection: width > 850 ? 'row' : 'column', gap: 18, marginBottom: 22 }}>
      <Card style={{ flex: 1 }}><SectionHeading title="Make it your pace" subtitle="Choose how often Veylo collects a sample." /><SegmentedControl label="Sampling interval" options={[{ value: 1000, label: '1 second' }, { value: 2000, label: '2 seconds' }, { value: 5000, label: '5 seconds' }]} value={preferences.sampleIntervalMs} onChange={value => { void updatePreferences({ sampleIntervalMs: value as 1000 | 2000 | 5000 }); }} /><Text style={{ fontSize: 12, color: c.textSecondary, lineHeight: 20, marginTop: 16 }}>Sampling pauses when the app is backgrounded or the browser tab is hidden. Up to 900 samples stay in memory; restarting the app starts a fresh session.</Text><View style={{ marginTop: 18 }}><Button label="Clear session" icon="refresh-outline" variant="secondary" small disabled={!history.length} onPress={() => setConfirmClear(true)} style={{ alignSelf: 'flex-start' }} /></View></Card>
      <Card style={{ flex: 1 }}><SectionHeading title="What these numbers mean" /><View style={{ gap: 15 }}><Text style={{ fontSize: 12, color: c.textSecondary, lineHeight: 21 }}><Text style={{ fontWeight: '600', color: c.text }}>Frame cadence</Text> counts animation-frame callbacks in the app’s JavaScript runtime. It is not GPU rendering performance or system-wide CPU usage.</Text><Text style={{ fontSize: 12, color: c.textSecondary, lineHeight: 21 }}><Text style={{ fontWeight: '600', color: c.text }}>Battery charge</Text> is read from the platform when supported. A flat line can simply mean the charge hasn’t changed.</Text><Text style={{ fontSize: 12, color: c.textSecondary, lineHeight: 21 }}>Temperature, CPU utilization, and system RAM usage are not exposed by the supported APIs, so Veylo doesn’t invent them.</Text></View></Card>
    </View>
    <Notice icon="shield-checkmark-outline">Your session stays in memory. Export it if you want to keep it. Gaps in the chart are pauses, not estimated readings.</Notice>
    <ConfirmDialog visible={confirmClear} title="Start a fresh session?" description="This clears the samples held in memory. Saved reports and downloaded exports are not affected." confirmLabel="Clear session" onCancel={() => setConfirmClear(false)} onConfirm={() => { clearSession(); setConfirmClear(false); show('Session cleared. A fresh perspective.'); }} />
  </Page>;
}
