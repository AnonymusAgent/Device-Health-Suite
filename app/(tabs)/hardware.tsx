import React, { useMemo, useState } from 'react';
import { TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useReports } from '@/contexts/ReportsContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, EmptyState, IconButton, IconTile, Notice, Page, PageHeader, SectionHeading, Text } from '@/components/ui';
import { SensorPanel } from '@/components/SensorPanel';
import { formatTime, snapshotRows } from '@/lib/diagnostics';
import { createSnapshotReport } from '@/lib/reports';

export default function DeviceScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { snapshot, loading, refreshing, error, refresh } = useSession();
  const { saveReport, ready } = useReports();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => snapshot ? snapshotRows(snapshot).filter(row => `${row.label} ${row.value} ${row.source}`.toLowerCase().includes(query.toLowerCase().trim())) : [], [snapshot, query]);
  const split = width >= 1050;
  const save = async () => {
    if (!snapshot || saving) return;
    setSaving(true);
    const saved = await saveReport(createSnapshotReport(snapshot));
    show(saved ? 'This device snapshot is saved in Reports.' : 'Could not save the snapshot.', !saved);
    setSaving(false);
  };
  return <Page>
    <PageHeader title="Your device" subtitle="The details that make your device yours—in plain language." actions={<><Button label="Refresh" icon="refresh-outline" variant="secondary" loading={refreshing} onPress={() => { void refresh(); }} small /><Button label="Save snapshot" icon="camera-outline" variant="secondary" disabled={!snapshot || !ready} loading={saving} onPress={() => { void save(); }} small /></>} />
    {error && <View style={{ marginBottom: 18 }}><Notice tone="danger">{error}</Notice></View>}
    <Card style={{ marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}><IconTile icon={snapshot?.platform === 'web' ? 'laptop-outline' : 'phone-portrait-outline'} size={62} /><View style={{ flex: 1, minWidth: 180, gap: 7 }}><Text style={{ fontSize: 23, fontWeight: '700', letterSpacing: -0.5 }}>{snapshot?.device.name || (loading ? 'Discovering your device…' : 'Device unavailable')}</Text><Text style={{ fontSize: 12, color: c.textSecondary }}>{snapshot?.device.os || 'Refresh to try again'} {snapshot?.device.type ? `· ${snapshot.device.type}` : ''}</Text></View><View style={{ gap: 8, alignItems: 'flex-end' }}><Badge tone="good" dot>{snapshot?.platform === 'web' ? 'Browser environment' : snapshot?.device.isDevice ? 'Physical device' : 'Simulator / unknown'}</Badge><Text style={{ fontSize: 10, color: c.textTertiary }}>{snapshot ? `Captured at ${formatTime(snapshot.capturedAt)}` : 'No snapshot yet'}</Text></View></Card>
    <View style={{ flexDirection: split ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
      <Card style={{ flex: split ? 1.65 : undefined, width: split ? undefined : '100%' }}>
        <SectionHeading title="Under the surface" subtitle="Every reading includes its source and limitations." />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 13, marginBottom: 15 }}><Ionicons name="search-outline" size={18} color={c.textTertiary} /><TextInput accessibilityLabel="Search device specifications" placeholder="Search specifications…" placeholderTextColor={c.textTertiary} value={query} onChangeText={setQuery} style={{ flex: 1, minHeight: 45, fontSize: 13, color: c.text, fontFamily: 'SpaceGrotesk_400Regular', outlineStyle: 'none' } as any} />{query ? <IconButton icon="close-outline" label="Clear search" onPress={() => setQuery('')} style={{ width: 32, height: 32, borderWidth: 0, backgroundColor: 'transparent' }} /> : null}</View>
        {rows.length ? rows.map((row, index) => {
          const missing = ['Unavailable', 'Not exposed'].includes(row.value);
          return <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, paddingVertical: 14, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderColor: c.border }}><View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 12 }}>{row.label}</Text><Text style={{ fontSize: 9, color: c.textTertiary, lineHeight: 14 }}>{row.source}</Text></View><Text style={{ fontSize: 12, color: missing ? c.textTertiary : c.text, fontWeight: missing ? '400' : '600', flex: 1, textAlign: 'right', lineHeight: 19 }}>{row.value}</Text></View>;
        }) : <EmptyState icon="search-outline" title={query ? 'No matching details' : 'No specifications yet'} description={query ? 'Try a different term, like battery, memory, or display.' : 'Refresh to read the capabilities available on this device.'} />}
      </Card>
      <View style={{ flex: split ? 1 : undefined, width: split ? undefined : '100%', gap: 20 }}><Card><SensorPanel /></Card>{snapshot?.warnings.length ? <Notice icon="information-circle-outline">{snapshot.warnings.join(' ')}</Notice> : null}<Notice icon="shield-checkmark-outline">Veylo doesn’t request your location, contacts, photos, or files to inspect these readings.</Notice></View>
    </View>
  </Page>;
}
