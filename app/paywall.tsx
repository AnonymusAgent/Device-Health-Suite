import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/SettingsContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, EmptyState, Notice, Page, PageHeader, SectionHeading, Text } from '@/components/ui';
import { BrandLogo } from '@/components/BrandLogo';
export default function MembershipScreen() {
  const c = useColors();
  const { available, isPremium, isLoading, packages, offeringsLoading, error, offeringsError, purchasePackage, restorePurchases, refreshOfferings } = usePremium();
  const { show } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = packages.find(pkg => pkg.identifier === selected) || packages[0];
  const purchase = async () => {
    if (!chosen || busy) return;
    setBusy(true); const result = await purchasePackage(chosen); setBusy(false);
    show(result.message, result.status === 'error');
    if (result.status === 'success') router.back();
  };
  const restore = async () => {
    setBusy(true); const result = await restorePurchases(); setBusy(false);
    show(result.message, result.status === 'error' || result.status === 'unavailable');
  };
  const manage = async () => {
    try { await Linking.openURL('https://apps.apple.com/account/subscriptions'); } catch { show('Open your App Store account settings to manage your membership.', true); }
  };
  return <Page><PageHeader title="Veylo Plus" subtitle="An optional membership. The same private, local-first experience." actions={<Button label="Close" icon="close-outline" variant="secondary" small onPress={() => router.canDismiss() ? router.dismiss() : router.replace('/')} />} />
    <View style={{ maxWidth: 650, width: '100%', alignSelf: 'center', gap: 20 }}><Card style={{ alignItems: 'center', gap: 16, padding: 30 }}><BrandLogo size={65} /><Text style={{ fontSize: 23, fontWeight: '700', textAlign: 'center' }}>More possibilities. No compromises.</Text><Text style={{ fontSize: 13, color: c.textSecondary, lineHeight: 22, textAlign: 'center' }}>Device checks, activity sessions, benchmarks, local reports, and exports are included for free. Any membership options below are provided by the configured app store.</Text><Badge tone="good">Your local features stay free</Badge></Card>
    {error && <Notice tone="warning">{error}</Notice>}
    {isPremium ? <Card><SectionHeading title="Your membership is active" subtitle="Thank you for supporting Veylo." /><Button label="Manage subscription" icon="open-outline" variant="secondary" onPress={() => { void manage(); }} /></Card> : !available ? <Card><EmptyState icon="storefront-outline" title="Not available in this environment" description="Membership options require a configured iOS or Android build. Nothing is simulated: you can use every local diagnostic feature without a purchase." action={<Button label="Back to your device" onPress={() => router.replace('/')} />} /></Card> : offeringsLoading ? <Card style={{ alignItems: 'center', gap: 15 }}><ActivityIndicator color={c.primary} /><Text style={{ fontSize: 12, color: c.textSecondary }}>Loading actual store options…</Text></Card> : offeringsError || !packages.length ? <Card><EmptyState icon="cloud-offline-outline" title={offeringsError ? 'The store is taking a moment' : 'No membership options yet'} description={offeringsError || 'There are no available products for this account. No purchase can be made.'} action={<Button label="Try again" variant="secondary" onPress={() => { void refreshOfferings(); }} />} /></Card> : <Card><SectionHeading title="Available options" subtitle="Prices and terms come directly from the store." /><View style={{ gap: 12 }}>{packages.map(pkg => <Pressable key={pkg.identifier} accessibilityRole="radio" accessibilityState={{ checked: chosen?.identifier === pkg.identifier }} aria-checked={chosen?.identifier === pkg.identifier} accessibilityLabel={`${pkg.product.title}, ${pkg.product.priceString}`} onPress={() => setSelected(pkg.identifier)} style={{ padding: 17, borderRadius: 12, borderWidth: 1.5, borderColor: chosen?.identifier === pkg.identifier ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: chosen?.identifier === pkg.identifier ? c.primaryDim : c.surface }}><Ionicons name={chosen?.identifier === pkg.identifier ? 'radio-button-on' : 'radio-button-off'} size={21} color={c.primary} /><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 14, fontWeight: '600' }}>{pkg.product.title}</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 17 }}>{pkg.product.description}</Text></View><Text style={{ fontSize: 16, fontWeight: '700' }}>{pkg.product.priceString}</Text></Pressable>)}</View><View style={{ marginTop: 20 }}><Button label="Continue to store checkout" icon="arrow-forward-outline" loading={busy} disabled={isLoading} onPress={() => { void purchase(); }} /></View></Card>}
    {available && <Button label="Restore purchases" variant="secondary" loading={busy || isLoading} onPress={() => { void restore(); }} />}
    <Text style={{ fontSize: 10, color: c.textTertiary, lineHeight: 17, textAlign: 'center' }}>Payment and renewal terms are shown by the app store before you confirm. Manage or cancel subscriptions in your store account. Veylo never receives your payment details.</Text></View>
  </Page>;
}
