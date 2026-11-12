import React, { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useReports } from '@/contexts/ReportsContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, EmptyState, IconTile, Notice, Page, PageHeader, SectionHeading, Text } from '@/components/ui';
import { MetricCard } from '@/components/MetricCard';
import { DeviceArt } from '@/components/DeviceArt';
import { createSnapshotReport } from '@/lib/reports';
import { deriveChecks, formatBytes, formatDate, formatPercent, formatTime, storageRatio } from '@/lib/diagnostics';

export default function OverviewScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { snapshot, loading, refreshing, error, refresh, lastUpdated } = useSession();
  const { reports, saveReport, ready } = useReports();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const checks = useMemo(() => deriveChecks(snapshot), [snapshot]);
  const attention = checks.filter(check => check.status === 'attention').length;
  const columns = width >= 1180 ? 4 : width >= 680 ? 2 : 2;
  const compact = width < 600;
  const split = width >= 1120;
  const battery = snapshot?.battery.value;
  const storage = snapshot?.storage.value;
  const web = snapshot?.platform === 'web';
  const saveSnapshot = async () => {
    if (!snapshot || saving) return;
    setSaving(true);
    const saved = await saveReport(createSnapshotReport(snapshot));
    show(saved ? 'Device snapshot saved to your reports.' : 'Couldn’t save the snapshot. Please try again.', !saved);
    setSaving(false);
  };
  const metrics = [
    { icon: 'battery-half-outline' as const, title: 'Battery', value: battery ? formatPercent(battery.level) : '—', subtitle: battery ? battery.charging ? 'Connected to power' : 'Running on battery' : 'Not exposed by this browser', badge: battery ? 'Device reading' : 'Unavailable', tone: 'good' as const, unavailable: !battery },
    { icon: 'server-outline' as const, title: web ? 'Browser storage' : 'Storage', value: storage ? formatBytes(storage.usedBytes) : '—', subtitle: storage ? `${formatBytes(storage.freeBytes)} available` : 'Storage access is restricted', badge: web ? 'Site quota · estimate' : 'Device reading', tone: 'info' as const, unavailable: !storage },
    { icon: 'layers-outline' as const, title: 'Device memory', value: snapshot?.memory.totalBytes.value ? formatBytes(snapshot.memory.totalBytes.value) : '—', subtitle: web ? 'Approximate capacity, not live usage' : 'Reported physical memory', badge: web ? 'Browser estimate' : snapshot?.memory.totalBytes.value ? 'Device reading' : 'Unavailable', tone: 'warning' as const, unavailable: !snapshot?.memory.totalBytes.value },
    { icon: 'hardware-chip-outline' as const, title: 'Logical processors', value: snapshot?.processor.cores.value ? String(snapshot.processor.cores.value) : '—', subtitle: 'CPU utilization is not exposed', badge: snapshot?.processor.cores.value ? 'Browser-reported' : 'Unavailable', tone: 'neutral' as const, unavailable: !snapshot?.processor.cores.value },
  ];
  return <Page>
    <PageHeader title="Overview" subtitle="Your device, a little better understood." actions={<><Button label="Refresh" icon="refresh-outline" variant="secondary" loading={refreshing} onPress={() => { void refresh(); }} small /><Button label="Save snapshot" icon="download-outline" variant="secondary" disabled={!snapshot || !ready} loading={saving} onPress={() => { void saveSnapshot(); }} small /></>} />
    {error && <View style={{ marginBottom: 16 }}><Notice tone="danger" icon="alert-circle-outline">{error}</Notice></View>}
    <View style={{ flexDirection: split ? 'row' : 'column', gap: 18, marginBottom: 22 }}>
      <Card style={{ flex: split ? 1.65 : undefined, backgroundColor: c.hero, borderColor: c.background === '#F6F8F7' ? '#D8E6D6' : c.border, padding: compact ? 22 : 28, minHeight: 248 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 17 }}><Ionicons name="sparkles-outline" size={15} color={c.heroText} /><Text style={{ color: c.heroText, fontSize: 9, letterSpacing: 1.6, fontWeight: '700' }}>A FRESH PERSPECTIVE</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1, zIndex: 1, gap: 12 }}><Text style={{ fontSize: compact ? 29 : 34, lineHeight: compact ? 36 : 42, fontWeight: '700', letterSpacing: -1.2, color: c.heroText }}>{loading ? 'Getting to know\nyour device.' : attention ? 'A little care\nmakes a difference.' : checks.length ? 'Looking good,\nfrom here.' : 'A clearer picture\nstarts here.'}</Text><Text style={{ color: c.heroText, opacity: 0.8, fontSize: 12, lineHeight: 20, maxWidth: 305 }}>{loading ? 'Checking the readings your platform makes available.' : attention ? `${attention} ${attention === 1 ? 'check could' : 'checks could'} use your attention. See what’s going on below.` : checks.length ? 'Your available checks look good. Keep a snapshot to remember this moment.' : 'Explore the readings your browser can share. No guesses, no invented scores.'}</Text><View style={{ flexDirection: 'row', marginTop: 3 }}><Button label="Run a quick check" icon="arrow-forward" onPress={() => router.push('/stress')} small /></View></View>{!compact && <View style={{ marginRight: -12, marginLeft: -15 }}><DeviceArt /></View>}</View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 }}><Ionicons name="shield-checkmark-outline" size={13} color={c.heroText} /><Text style={{ fontSize: 10, color: c.heroText, opacity: 0.75 }}>{checks.length} supported checks · {lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Private by design'}</Text></View>
      </Card>
      <Card style={{ flex: split ? 1 : undefined, gap: 18, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 10, letterSpacing: 1.4, color: c.textTertiary, fontWeight: '600' }}>THE DEVICE YOU’RE ON</Text><Ionicons name="ellipsis-horizontal" size={18} color={c.textTertiary} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><IconTile icon={web ? 'laptop-outline' : 'phone-portrait-outline'} size={51} /><View style={{ flex: 1, gap: 6 }}><Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 25 }}>{snapshot?.device.name || 'Discovering your device…'}</Text><Text style={{ fontSize: 12, color: c.textSecondary }}>{snapshot?.device.os || 'Reading platform information'}</Text></View></View>
        <View style={{ gap: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 12, color: c.textSecondary }}>Environment</Text><Badge tone={web ? 'info' : 'good'}>{web ? 'Browser preview' : snapshot?.device.isDevice ? 'Physical device' : 'Simulator'}</Badge></View><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: c.textSecondary }}>Connection</Text><Text style={{ fontSize: 12, fontWeight: '600' }}>{snapshot?.network.online === null || !snapshot ? 'Not exposed' : snapshot.network.online ? snapshot.network.transport || 'Connected' : 'Offline'}</Text></View></View>
        <Pressable accessibilityRole="link" accessibilityLabel="Explore device specifications" onPress={() => router.push('/hardware')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: c.border, paddingTop: 15 }}><Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Explore device details</Text><Ionicons name="arrow-forward" size={15} color={c.primary} /></Pressable>
      </Card>
    </View>
    <SectionHeading title="The essentials" subtitle="Useful readings, with their source. Never a guessed number." action={<Badge tone="neutral">{web ? 'Browser capabilities' : 'Device capabilities'}</Badge>} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 25 }}>{metrics.map(metric => <View key={metric.title} style={{ flexGrow: 1, flexBasis: columns === 4 ? '22%' : '44%' }}><MetricCard {...metric} /></View>)}</View>
    <View style={{ flexDirection: split ? 'row' : 'column', gap: 18 }}>
      <Card style={{ flex: split ? 1.2 : undefined }}><SectionHeading title="A quick check-in" subtitle="A little context, not a hardware diagnosis." action={<Ionicons name="checkmark-done-outline" size={21} color={c.primary} />} />
        {checks.length ? <View style={{ gap: 19 }}>{checks.map(check => <View key={check.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><IconTile icon={check.status === 'good' ? 'checkmark-circle-outline' : check.status === 'attention' ? 'alert-circle-outline' : 'leaf-outline'} tone={check.status === 'good' ? 'good' : check.status === 'attention' ? 'warning' : 'info'} size={33} /><View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 12, fontWeight: '600' }}>{check.title}</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 18 }}>{check.description}</Text></View></View>)}</View> : <EmptyState icon="scan-outline" title={loading ? 'Checking available readings' : 'Some things stay private'} description="Readings that aren’t exposed are labeled unavailable, never filled in with sample data." />}
        {storage && <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderColor: c.border, gap: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 10, color: c.textSecondary }}>{web ? 'Site storage headroom' : 'Storage headroom'}</Text><Text style={{ fontSize: 10, color: c.primary }}>{formatPercent(1 - storageRatio(storage))} free</Text></View><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(storageRatio(storage) * 100) }} style={{ height: 5, borderRadius: 3, backgroundColor: c.surfaceElevated, overflow: 'hidden' }}><View style={{ height: '100%', width: `${storageRatio(storage) * 100}%`, backgroundColor: c.primary, borderRadius: 3 }} /></View></View>}
      </Card>
      <Card style={{ flex: split ? 1 : undefined }}><SectionHeading title="Your recent reports" subtitle="Little insights, saved for later." action={<Button label="View all" variant="ghost" small onPress={() => router.push('/reports')} />} />
        {reports.length ? <View style={{ gap: 4 }}>{reports.slice(0, 3).map(report => <Pressable key={report.id} accessibilityRole="link" accessibilityLabel={`Open ${report.title} from ${formatDate(report.createdAt)}`} onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, opacity: pressed ? 0.6 : 1 })}><IconTile icon={report.kind === 'snapshot' ? 'camera-outline' : report.kind === 'compute' ? 'hardware-chip-outline' : 'layers-outline'} tone={report.kind === 'snapshot' ? 'info' : 'good'} size={37} /><View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 12, fontWeight: '600' }}>{report.title}</Text><Text style={{ fontSize: 10, color: c.textSecondary }}>{formatDate(report.createdAt)} · {formatTime(report.createdAt)}</Text></View><Ionicons name="chevron-forward" size={15} color={c.textTertiary} /></Pressable>)}</View> : <EmptyState icon="document-text-outline" title="A fresh start" description="Run a check or save a snapshot. Your findings will be right here, only on this device." action={<Button label="Run your first check" variant="secondary" icon="arrow-forward" small onPress={() => router.push('/stress')} />} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17, paddingTop: 15, borderTopWidth: 1, borderColor: c.border }}><Ionicons name="lock-closed-outline" size={13} color={c.textTertiary} /><Text style={{ fontSize: 10, color: c.textTertiary }}>Saved locally. Never uploaded.</Text></View>
      </Card>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 27 }}><Ionicons name="leaf-outline" size={13} color={c.textTertiary} /><Text style={{ fontSize: 10, color: c.textTertiary, textAlign: 'center' }}>A clearer picture. A calmer relationship with your device.</Text></View>
  </Page>;
}
