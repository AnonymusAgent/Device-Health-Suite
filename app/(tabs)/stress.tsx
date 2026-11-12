import React, { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useColors, useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useReports } from '@/contexts/ReportsContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, IconTile, Notice, Page, PageHeader, SectionHeading, SegmentedControl, Text, type IconName } from '@/components/ui';
import { benchmarkMetrics, runBenchmark, type BenchmarkKind, type BenchmarkProgress, type BenchmarkResult } from '@/lib/benchmarks';
import { createBenchmarkReport } from '@/lib/reports';

function BenchmarkCard({ kind, running, busy, progress, result, onStart, onStop, onSave, saving }: {
  kind: BenchmarkKind; running: boolean; busy: boolean; progress: BenchmarkProgress | null; result: BenchmarkResult | null;
  onStart: (durationMs: number) => void; onStop: () => void; onSave: () => void; saving: boolean;
}) {
  const c = useColors();
  const [duration, setDuration] = useState(kind === 'compute' ? 10000 : 5000);
  const compute = kind === 'compute';
  const icon: IconName = compute ? 'hardware-chip-outline' : 'layers-outline';
  return <Card testID={`benchmark-${kind}`} style={{ flex: 1, gap: 21 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}><IconTile icon={icon} tone={compute ? 'good' : 'info'} size={47} /><View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '700' }}>{compute ? 'Compute check' : 'Memory check'}</Text><Text style={{ fontSize: 11, color: c.textSecondary }}>{compute ? 'A little workout for your processor' : 'A bounded check of allocation & integrity'}</Text></View></View>
    <Text style={{ fontSize: 13, color: c.textSecondary, lineHeight: 22 }}>{compute ? 'Measure a short integer workload in the JavaScript runtime. Useful for comparing runs on this device—not for ranking different phones.' : 'Allocate and verify small typed-array buffers, keeping at most 16 MiB alive at once. This does not test all of your device’s RAM.'}</Text>
    <View style={{ gap: 10 }}><Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>CHECK DURATION</Text><SegmentedControl label={`${kind} duration`} options={compute ? [{ value: 5000, label: '5 seconds' }, { value: 10000, label: '10 seconds' }, { value: 15000, label: '15 seconds' }] : [{ value: 5000, label: '5 seconds' }, { value: 10000, label: '10 seconds' }]} value={duration} onChange={setDuration} /></View>
    {running && <View style={{ gap: 11, backgroundColor: c.surfaceElevated, padding: 17, borderRadius: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12 }}>{progress?.metric || 'Warming up…'}</Text><Text style={{ fontSize: 12, color: c.primary }}>{Math.round((progress?.progress || 0) * 100)}%</Text></View><View accessibilityRole="progressbar" accessibilityLabel={`${kind} check progress`} accessibilityValue={{ min: 0, max: 100, now: Math.round((progress?.progress || 0) * 100) }} style={{ height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden' }}><View style={{ width: `${(progress?.progress || 0) * 100}%`, height: '100%', backgroundColor: c.primary, borderRadius: 3 }} /></View><Text style={{ fontSize: 23, fontWeight: '700' }}>{progress?.value || 'Starting safely…'}</Text></View>}
    {result && !running && <View style={{ gap: 14, backgroundColor: result.status === 'error' ? c.dangerDim : c.surfaceElevated, padding: 17, borderRadius: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Badge tone={result.status === 'completed' ? 'good' : result.status === 'cancelled' ? 'warning' : 'danger'}>{result.status === 'completed' ? 'Completed' : result.status === 'cancelled' ? 'Stopped early' : 'Could not finish'}</Badge><Text style={{ fontSize: 10, color: c.textSecondary }}>{(result.durationMs / 1000).toFixed(2)} seconds</Text></View>{result.status === 'completed' && <Text style={{ fontSize: 29, fontWeight: '700', letterSpacing: -0.8 }}>{compute ? Math.round(result.throughput).toLocaleString() : result.checkedMemoryMiB}<Text style={{ fontSize: 13, color: c.textSecondary, fontWeight: '400' }}> {compute ? 'ops / sec' : 'MiB checked'}</Text></Text>}{result.error && <Text style={{ fontSize: 12, color: c.danger, lineHeight: 19 }}>{result.error}</Text>}{benchmarkMetrics(result).map(metric => <View key={metric.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 11, color: c.textSecondary, flex: 1 }}>{metric.label}</Text><Text style={{ fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'right' }}>{metric.value}</Text></View>)}{result.status !== 'error' && <Button label="Save this report" icon="bookmark-outline" variant="secondary" small loading={saving} onPress={onSave} />}</View>}
    <View style={{ marginTop: 'auto', gap: 12 }}><Button label={running ? 'Stop check' : result ? `Run ${kind} again` : `Run ${kind} check`} icon={running ? 'stop-outline' : 'play-outline'} variant={running ? 'danger' : 'primary'} disabled={busy && !running} onPress={running ? onStop : () => onStart(duration)} /><Text style={{ fontSize: 10, color: c.textTertiary, textAlign: 'center' }}>{compute ? 'Single-threaded · Yields to keep the app responsive' : '16 MiB working-set cap · Buffers always released'}</Text></View>
  </Card>;
}
export default function BenchmarksScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { snapshot } = useSession();
  const { preferences } = useSettings();
  const { saveReport, ready } = useReports();
  const { show } = useToast();
  const [active, setActive] = useState<BenchmarkKind | null>(null);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [results, setResults] = useState<{ compute: BenchmarkResult | null; memory: BenchmarkResult | null }>({ compute: null, memory: null });
  const [saving, setSaving] = useState<BenchmarkKind | null>(null);
  const controller = useRef<AbortController | null>(null);
  const runningGuard = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const start = async (kind: BenchmarkKind, durationMs: number) => {
    if (runningGuard.current) return;
    runningGuard.current = true;
    const abort = new AbortController(); controller.current = abort;
    setActive(kind); setProgress(null); setResults(previous => ({ ...previous, [kind]: null }));
    try {
      const result = await runBenchmark(kind, { durationMs, maxMemoryMiB: 16 }, value => { if (mounted.current) setProgress(value); }, abort.signal);
      if (!mounted.current) return;
      setResults(previous => ({ ...previous, [kind]: result }));
      if (result.status === 'completed' && preferences.autoSave && ready) {
        const saved = await saveReport(createBenchmarkReport(result, snapshot));
        if (mounted.current) show(saved ? `${kind === 'compute' ? 'Compute' : 'Memory'} check saved to Reports.` : 'Check finished, but the report could not be saved.', !saved);
      } else if (result.status === 'cancelled') show('Check stopped. All working buffers were released.');
      else if (result.status === 'error') show(result.error || 'The check could not finish.', true);
    } catch {
      if (mounted.current) show('The check could not start. Please try again.', true);
    } finally {
      runningGuard.current = false;
      if (mounted.current) setActive(null);
    }
  };
  const save = async (kind: BenchmarkKind) => {
    const result = results[kind];
    if (!result || result.status === 'error' || saving) return;
    setSaving(kind);
    const saved = await saveReport(createBenchmarkReport(result, snapshot));
    show(saved ? 'Report saved. Find it in your Reports.' : 'Could not save this report. Please try again.', !saved);
    if (mounted.current) setSaving(null);
  };
  return <Page>
    <PageHeader title="Benchmarks" subtitle="Short check-ins. Real measurements. No made-up scores." actions={<Button label="View reports" icon="documents-outline" variant="secondary" onPress={() => router.push('/reports')} small />} />
    <View style={{ marginBottom: 23 }}><Notice icon="shield-checkmark-outline">You’re in control. Checks stop on request or when you leave this screen. Memory is bounded, and every buffer is released. No thermal or battery-endurance claims.</Notice></View>
    {snapshot?.battery.value && snapshot.battery.value.level < 0.2 && !snapshot.battery.value.charging && <View style={{ marginBottom: 20 }}><Notice tone="warning" icon="battery-dead-outline">Your battery is below 20%. Consider connecting a charger before running a compute check.</Notice></View>}
    <View style={{ flexDirection: width >= 850 ? 'row' : 'column', gap: 20, marginBottom: 24 }}>
      {(['compute', 'memory'] as const).map(kind => <BenchmarkCard key={kind} kind={kind} running={active === kind} busy={active !== null || saving !== null} progress={active === kind ? progress : null} result={results[kind]} onStart={duration => { void start(kind, duration); }} onStop={() => controller.current?.abort()} onSave={() => { void save(kind); }} saving={saving === kind || !ready} />)}
    </View>
    <Card><SectionHeading title="Honest benchmarks, useful context" subtitle="Here’s what a check can—and can’t—tell you." /><View style={{ flexDirection: width >= 850 ? 'row' : 'column', gap: 25 }}>{[
      { icon: 'hardware-chip-outline' as const, title: 'Your runtime, not the whole chip', text: 'Compute results reflect the JavaScript engine, current load, power settings, and browser or native runtime. There is no simulated multi-core test.' },
      { icon: 'layers-outline' as const, title: 'A small, safe working set', text: 'The memory check verifies sampled writes and measures a bounded working set. It cannot diagnose faulty RAM or report system memory usage.' },
      { icon: 'git-compare-outline' as const, title: 'Compare like with like', text: 'Use the same duration, runtime, and device conditions. A cancelled run is partial work, not a pass, failure, or health score.' },
    ].map(item => <View key={item.title} style={{ flex: 1, gap: 10 }}><IconTile icon={item.icon} tone="neutral" size={32} /><Text style={{ fontSize: 12, fontWeight: '600' }}>{item.title}</Text><Text style={{ fontSize: 11, lineHeight: 19, color: c.textSecondary }}>{item.text}</Text></View>)}</View></Card>
    <Text style={{ fontSize: 10, color: c.textTertiary, textAlign: 'center', marginTop: 22 }}>{preferences.autoSave ? 'Completed checks are saved automatically. The most recent 50 reports are kept.' : 'Automatic saving is off. Use “Save this report” to keep a completed check.'}</Text>
  </Page>;
}
