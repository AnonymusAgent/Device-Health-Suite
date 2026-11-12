import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/SettingsContext';
import { useReports } from '@/contexts/ReportsContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, IconTile, Notice, Page, PageHeader, SegmentedControl, Text } from '@/components/ui';
import { reportsToCSV, type DiagnosticReport } from '@/lib/reports';
import { formatDate, formatTime } from '@/lib/diagnostics';
import { exportDate, exportText } from '@/lib/export';

export function ReportRow({ report, onDelete }: { report: DiagnosticReport; onDelete?: () => void }) {
  const c = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 17, borderBottomWidth: 1, borderColor: c.border }}><Pressable accessibilityRole="link" accessibilityLabel={`Open ${report.title}, ${formatDate(report.createdAt)}, ${report.status}`} onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.65 : 1 })}><IconTile icon={report.kind === 'snapshot' ? 'camera-outline' : report.kind === 'compute' ? 'hardware-chip-outline' : 'layers-outline'} tone={report.kind === 'snapshot' ? 'info' : report.kind === 'memory' ? 'warning' : 'good'} size={44} /><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 14, fontWeight: '600' }}>{report.title}</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 17 }}>{report.deviceName} · {formatDate(report.createdAt)} at {formatTime(report.createdAt)}</Text></View><View style={{ gap: 6, alignItems: 'flex-end' }}><Badge tone={report.status === 'completed' ? 'good' : 'warning'}>{report.status === 'completed' ? 'Completed' : 'Stopped early'}</Badge>{report.kind !== 'snapshot' && <Text style={{ fontSize: 10, color: c.textTertiary }}>{(report.durationMs / 1000).toFixed(1)} seconds</Text>}</View><Ionicons name="chevron-forward" size={16} color={c.textTertiary} /></Pressable>{onDelete && <IconButton icon="trash-outline" label={`Delete ${report.title} from ${formatDate(report.createdAt)}`} onPress={onDelete} style={{ borderWidth: 0, backgroundColor: 'transparent' }} />}</View>;
}
export default function ReportsScreen() {
  const c = useColors();
  const { reports, ready, error, deleteReport, retry } = useReports();
  const { show } = useToast();
  const [filter, setFilter] = useState<'all' | 'benchmark' | 'snapshot'>('all');
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const filtered = useMemo(() => reports.filter(report => (filter === 'all' || (filter === 'snapshot' ? report.kind === 'snapshot' : report.kind !== 'snapshot')) && `${report.title} ${report.deviceName} ${report.summary}`.toLowerCase().includes(query.trim().toLowerCase())), [reports, filter, query]);
  const exportAll = async (format: 'json' | 'csv') => {
    if (!filtered.length || exporting) return;
    setExporting(true);
    try {
      const result = await exportText(`veylo-reports-${exportDate()}.${format}`, format === 'json' ? JSON.stringify({ app: 'Veylo', version: 1, exportedAt: new Date().toISOString(), reports: filtered }, null, 2) : reportsToCSV(filtered), format === 'json' ? 'application/json' : 'text/csv');
      show(result === 'downloaded' ? `${filtered.length} reports exported as ${format.toUpperCase()}.` : 'Share sheet opened. Choose where to save your reports.');
    } catch (error) { show(error instanceof Error ? error.message : 'Export failed. Please try again.', true); }
    finally { setExporting(false); }
  };
  const confirmDelete = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    const deleted = await deleteReport(deleting);
    show(deleted ? 'Report deleted from this device.' : 'Could not delete the report.', !deleted);
    setBusy(false); setDeleting(null);
  };
  return <Page>
    <PageHeader title="Your reports" subtitle="A small history of useful discoveries. Kept close, never uploaded." actions={<><Button label="Export CSV" icon="grid-outline" variant="secondary" disabled={!filtered.length} loading={exporting} onPress={() => { void exportAll('csv'); }} small /><Button label="Export JSON" icon="download-outline" variant="secondary" disabled={!filtered.length} loading={exporting} onPress={() => { void exportAll('json'); }} small /></>} />
    {error && <View style={{ marginBottom: 20 }}><Notice tone="danger" icon="alert-circle-outline">{error} <Text onPress={() => { void retry(); }} style={{ color: c.primary, fontWeight: '700' }}> Retry loading</Text></Notice></View>}
    <Card style={{ marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }}><IconTile icon="documents-outline" size={47} /><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 20, fontWeight: '700' }}>{reports.length} {reports.length === 1 ? 'moment' : 'moments'} of clarity</Text><Text style={{ fontSize: 12, color: c.textSecondary, lineHeight: 19 }}>Snapshots and check results, saved only on this device.</Text></View><Badge tone="good">Local storage</Badge></Card>
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15, marginBottom: 10 }}><SegmentedControl label="Report type" options={[{ value: 'all', label: 'All reports' }, { value: 'benchmark', label: 'Benchmarks' }, { value: 'snapshot', label: 'Snapshots' }]} value={filter} onChange={setFilter} /><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: c.border, borderRadius: 9, paddingHorizontal: 12, backgroundColor: c.background, flex: 1, minWidth: 170, maxWidth: 290 }}><Ionicons name="search-outline" size={16} color={c.textTertiary} /><TextInput accessibilityLabel="Search reports" placeholder="Find a report…" placeholderTextColor={c.textTertiary} value={query} onChangeText={setQuery} style={{ minHeight: 40, flex: 1, color: c.text, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', outlineStyle: 'none' } as any} /></View></View>
      {!ready && !reports.length ? <EmptyState icon="hourglass-outline" title="Your reports are private" description={error ? 'We couldn’t read the saved collection. Retry above, or clear it in Settings.' : 'Loading your locally saved reports…'} /> : filtered.length ? <View>{filtered.map(report => <ReportRow key={report.id} report={report} onDelete={() => setDeleting(report.id)} />)}</View> : <EmptyState icon={reports.length ? 'search-outline' : 'document-text-outline'} title={reports.length ? 'Nothing matches just yet' : 'Your story starts with a check-in'} description={reports.length ? 'Try another search or report type.' : 'Save a device snapshot or run a benchmark. Your results will appear here, ready to revisit or export.'} action={!reports.length ? <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><Button label="Run a check" icon="speedometer-outline" onPress={() => router.push('/stress')} /><Button label="Device snapshot" icon="camera-outline" variant="secondary" onPress={() => router.push('/')} /></View> : undefined} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 19 }}><Text style={{ fontSize: 10, color: c.textTertiary }}>The latest 50 reports are kept. Older ones are replaced.</Text><Button label="New check" icon="add-outline" variant="ghost" small onPress={() => router.push('/stress')} /></View>
    </Card>
    <ConfirmDialog visible={deleting !== null} title="Delete this report?" description="This removes the report from this device. Downloaded copies are not affected. This cannot be undone." confirmLabel="Delete report" destructive busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => { void confirmDelete(); }} />
  </Page>;
}
