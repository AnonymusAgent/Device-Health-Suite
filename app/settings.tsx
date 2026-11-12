import React, { useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useColors, useSettings } from '@/contexts/SettingsContext';
import { useReports } from '@/contexts/ReportsContext';
import { useToast } from '@/contexts/ToastContext';
import { usePremium } from '@/contexts/PremiumContext';
import { Badge, Button, Card, ConfirmDialog, IconTile, Notice, Page, PageHeader, SectionHeading, SegmentedControl, Text } from '@/components/ui';
import { Brand } from '@/components/BrandLogo';

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const c = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 22, paddingVertical: 17 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 13, fontWeight: '600' }}>{title}</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 18 }}>{description}</Text></View>{children}</View>;
}
export default function SettingsScreen() {
  const c = useColors();
  const { preferences, updatePreferences, storageError, isDark } = useSettings();
  const { reports, clearReports, error } = useReports();
  const premium = usePremium();
  const { show } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const clear = async () => {
    setBusy(true); const cleared = await clearReports(); setBusy(false); setConfirm(false);
    show(cleared ? 'All local reports have been cleared.' : 'Could not clear reports. Please try again.', !cleared);
  };
  return <Page>
    <PageHeader title="Make yourself at home" subtitle="A few thoughtful controls. Everything stays on your device." actions={<Button label="Done" icon="checkmark-outline" variant="secondary" onPress={() => router.canDismiss() ? router.dismiss() : router.replace('/')} small />} />
    {storageError && <View style={{ marginBottom: 18 }}><Notice tone="warning">{storageError}</Notice></View>}
    {error && <View style={{ marginBottom: 18 }}><Notice tone="danger">{error}</Notice></View>}
    <View style={{ gap: 20, maxWidth: 820, width: '100%', alignSelf: 'flex-start' }}>
      <Card><SectionHeading title="Look & feel" subtitle="A lighter view, or something a little quieter." /><SettingRow title="Appearance" description="System follows your device’s current appearance."><SegmentedControl label="Appearance" options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} value={preferences.theme} onChange={theme => { void updatePreferences({ theme }); }} /></SettingRow><SettingRow title="Reduce motion" description="Turn off screen transition animations."><Switch accessibilityLabel="Reduce motion" value={preferences.reduceMotion} onValueChange={reduceMotion => { void updatePreferences({ reduceMotion }); }} trackColor={{ false: c.border, true: c.primary }} thumbColor={Platform.OS === 'android' ? c.surface : undefined} /></SettingRow></Card>
      <Card><SectionHeading title="Your activity session" subtitle="Choose a comfortable sampling pace." /><SettingRow title="Sampling interval" description="More frequent samples use a little more processing power."><SegmentedControl label="Sampling interval" options={[{ value: 1000, label: '1s' }, { value: 2000, label: '2s' }, { value: 5000, label: '5s' }]} value={preferences.sampleIntervalMs} onChange={value => { void updatePreferences({ sampleIntervalMs: value as 1000 | 2000 | 5000 }); }} /></SettingRow><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 19 }}>Sessions are memory-only and pause in the background. Your sampling preference is saved; the samples themselves are not.</Text></Card>
      <Card><SectionHeading title="Reports & local data" subtitle="You decide what to keep." /><SettingRow title="Automatically save completed checks" description="Keep results in Reports without an extra tap. Stopped checks are never auto-saved."><Switch accessibilityLabel="Automatically save completed checks" value={preferences.autoSave} onValueChange={autoSave => { void updatePreferences({ autoSave }); }} trackColor={{ false: c.border, true: c.primary }} thumbColor={Platform.OS === 'android' ? c.surface : undefined} /></SettingRow><SettingRow title={`${reports.length} saved ${reports.length === 1 ? 'report' : 'reports'}`} description="The most recent 50 reports are kept. Export favorites before they are replaced."><Button label="View reports" variant="secondary" small onPress={() => router.push('/reports')} /></SettingRow><View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 180, gap: 5 }}><Text style={{ fontSize: 13, fontWeight: '600' }}>Clear local reports</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 18 }}>Permanently remove all saved reports and snapshots.</Text></View><Button label="Clear reports" icon="trash-outline" variant="danger" small onPress={() => setConfirm(true)} /></View></Card>
      <Card><SectionHeading title="Privacy, by default" /><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 18 }}><IconTile icon="shield-checkmark-outline" size={43} /><Text style={{ flex: 1, fontSize: 12, color: c.textSecondary, lineHeight: 21 }}>No account, analytics, advertising, or telemetry uploads. Device readings stay in your browser or on your phone.</Text></View><Button label="Privacy & your data" icon="arrow-forward-outline" variant="secondary" onPress={() => router.push('/privacy')} style={{ alignSelf: 'flex-start' }} /></Card>
      {premium.available && <Card><SectionHeading title="Veylo Plus" subtitle="Optional native membership, managed by RevenueCat." /><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15 }}><Badge tone={premium.isPremium ? 'good' : 'neutral'}>{premium.isLoading ? 'Checking membership…' : premium.isPremium ? 'Membership active' : 'Free local experience'}</Badge><Button label={premium.isPremium ? 'Manage / restore' : 'View options'} variant="secondary" small onPress={() => router.push('/paywall')} /></View><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 18, marginTop: 15 }}>All local diagnostics, reports, and exports are included without a membership.</Text></Card>}
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 16 }}><Brand compact /><Text style={{ fontSize: 11, color: c.textSecondary }}>Version 1.0 · {isDark ? 'Quiet evenings' : 'A fresh perspective'}</Text><Text style={{ fontSize: 10, color: c.textTertiary, textAlign: 'center' }}>Made for a calmer relationship with your device.</Text></View>
    </View>
    <ConfirmDialog visible={confirm} title="Clear every local report?" description={`This permanently deletes ${reports.length} saved reports and snapshots from this device. Export anything you want to keep first. Preferences and downloaded files are not affected.`} confirmLabel="Clear all reports" destructive busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => { void clear(); }} />
  </Page>;
}
