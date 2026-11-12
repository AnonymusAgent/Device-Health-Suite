import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/contexts/SettingsContext';
import { useReports } from '@/contexts/ReportsContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconTile, Notice, Page, PageHeader, SectionHeading, Text } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/diagnostics';
import { deriveInsights } from '@/lib/insights';
import { compareBenchmarks, comparableReports, formatThroughput } from '@/lib/comparisons';
import { reportsToCSV } from '@/lib/reports';
import { exportText } from '@/lib/export';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reports, ready, deleteReport } = useReports();
  const c = useColors();
  const { show } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const report = reports.find(item => item.id === id);
  const previous = useMemo(() => report ? comparableReports(report, reports)[0] : undefined, [report, reports]);
  const comparison = useMemo(() => {
    if (!report || !previous) return { comparison: null, reason: 'No earlier like-for-like run to compare against.' };
    return compareBenchmarks(report, previous);
  }, [report, previous]);
  const insights = useMemo(() => report?.snapshot ? deriveInsights(report.snapshot) : [], [report]);
  if (!report) return <Page><Card><EmptyState icon="document-text-outline" title={ready ? 'This report isn’t here' : 'Opening your reports'} description={ready ? 'It may have been deleted, replaced, or saved on a different device.' : 'If loading failed, return to Reports to retry.'} action={<Button label="Back to reports" onPress={() => router.replace('/reports')} />} /></Card></Page>;
  const exportReport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const result = await exportText(`veylo-${report.kind}-${report.id.slice(0, 8)}.${format}`, format === 'json' ? JSON.stringify({ app: 'Veylo', version: 1, report }, null, 2) : reportsToCSV([report]), format === 'json' ? 'application/json' : 'text/csv');
      show(result === 'downloaded' ? 'Report download started.' : 'Share sheet opened.');
    } catch (error) { show(error instanceof Error ? error.message : 'Could not export report.', true); }
    finally { setExporting(false); }
  };
  const remove = async () => {
    setBusy(true);
    const deleted = await deleteReport(report.id);
    setBusy(false); setConfirm(false);
    show(deleted ? 'Report deleted.' : 'Could not delete report.', !deleted);
    if (deleted) router.replace('/reports');
  };
  return <Page>
    <View style={{ marginBottom: 18 }}><Button label="All reports" icon="arrow-back-outline" variant="ghost" small onPress={() => router.replace('/reports')} style={{ alignSelf: 'flex-start' }} /></View>
    <PageHeader eyebrow="A MOMENT OF CLARITY" title={report.title} subtitle={`${formatDate(report.createdAt)} at ${formatTime(report.createdAt)} · ${report.deviceName}`} actions={<><Button label="CSV" icon="grid-outline" variant="secondary" loading={exporting} onPress={() => { void exportReport('csv'); }} small /><Button label="Export JSON" icon="download-outline" loading={exporting} onPress={() => { void exportReport('json'); }} small /></>} />
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: 22, flexWrap: 'wrap' }}><Badge tone={report.status === 'completed' ? 'good' : 'warning'}>{report.status === 'completed' ? 'Completed' : 'Stopped early · partial work'}</Badge><Badge tone="info">{report.platform}</Badge><Badge>{report.kind === 'snapshot' ? 'Device snapshot' : 'Runtime benchmark'}</Badge></View>
    <Card style={{ marginBottom: 22 }}><View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}><IconTile icon={report.kind === 'snapshot' ? 'camera-outline' : 'speedometer-outline'} size={43} /><Text style={{ flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 23 }}>{report.summary}</Text></View></Card>
    <Card style={{ marginBottom: 22 }}><SectionHeading title={report.kind === 'snapshot' ? 'The captured readings' : 'The measured details'} subtitle="Unavailable values are explicitly identified. Sources travel with the export." /><View style={{ gap: 10 }}>{report.metrics.map((metric, index) => <View key={`${metric.label}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 24, paddingVertical: 14, borderBottomWidth: index === report.metrics.length - 1 ? 0 : 1, borderColor: c.border }}><Text style={{ flex: 1, fontSize: 12, color: c.textSecondary, lineHeight: 20 }}>{metric.label}</Text><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}><Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'right', lineHeight: 20 }}>{metric.value}</Text>{metric.status && metric.status !== 'measured' ? <Badge tone={metric.status === 'estimated' ? 'info' : 'neutral'}>{metric.status}</Badge> : null}</View></View>)}</View></Card>
    {insights.length ? <Card style={{ marginBottom: 22 }}><SectionHeading title="What these readings suggest" subtitle="Deterministic rules, not a health score." /><View style={{ gap: 10 }}>{insights.map(insight => <View key={insight.id} style={{ borderLeftWidth: 4, borderColor: c.border, paddingLeft: 12, gap: 6, marginBottom: 10 }}><Text style={{ fontSize: 12, fontWeight: '700' }}>{insight.title}</Text><Text style={{ fontSize: 12, color: c.textSecondary, lineHeight: 20 }}>{insight.measured}</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 18 }}>{insight.limitations}</Text><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}><Badge tone={insight.status === 'attention' ? 'warning' : insight.status === 'good' ? 'good' : 'info'}>{insight.status === 'attention' ? 'Attention' : insight.status === 'good' ? 'Looks good' : 'For context'}</Badge><Badge tone="neutral">{insight.confidence}</Badge><Text style={{ fontSize: 10, color: c.textTertiary }}>{insight.source}</Text></View><Text style={{ fontSize: 12, color: c.text, lineHeight: 20 }}><Text style={{ fontWeight: '600' }}>What to do: </Text>{insight.recommendation}</Text></View>)}</View></Card> : null}
    {report.kind !== 'snapshot' ? <Card style={{ marginBottom: 22 }}><SectionHeading title="Against your history" subtitle="Only runs with the same device, runtime, workload version, duration and memory cap compare." /><View style={{ gap: 12 }}>{comparison.comparison ? <><View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', marginBottom: 10 }}><Text style={{ fontSize: 27, fontWeight: '700', letterSpacing: -1 }}>{formatThroughput(comparison.comparison.current, comparison.comparison.unit)}</Text><View style={{ gap: 4 }}><Text style={{ fontSize: 12, color: c.textSecondary }}>Previous</Text><Text style={{ fontSize: 11, color: c.textTertiary }}>from ${new Date(comparison.comparison.previousAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View></View><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ fontSize: 13, fontWeight: '700', color: comparison.comparison.difference >= 0 ? c.text : c.danger }}>{comparison.comparison.difference >= 0 ? '+' : ''}{comparison.comparison.percentDifference === null ? '—' : comparison.comparison.percentDifference.toFixed(1)}%</Text><Text style={{ fontSize: 11, color: c.textSecondary }}>{comparison.comparison.unit === 'ops/s' ? 'throughput' : 'checked throughput'} vs previous run · {comparison.comparison.configuration}</Text></View></> : <Notice icon="information-circle-outline">{comparison.reason}</Notice>}</View></Card> : null}
    {report.snapshot?.warnings.length ? <View style={{ marginBottom: 22 }}><Notice>{report.snapshot.warnings.join(' ')}</Notice></View> : null}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}><Text style={{ fontSize: 10, color: c.textTertiary }}>Report ID: {report.id}</Text><Button label="Delete report" icon="trash-outline" variant="danger" small onPress={() => setConfirm(true)} /></View>
    <ConfirmDialog visible={confirm} title="Delete this report?" description="This removes the local report permanently. Any copies you exported are unaffected." confirmLabel="Delete report" destructive busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => { void remove(); }} />
  </Page>;
}
