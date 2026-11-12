import React, { useEffect } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useSettings } from '@/contexts/SettingsContext';
import { Brand, BrandLogo } from './BrandLogo';
import { Badge, IconButton, Text, type IconName } from './ui';

const navigation: { href: Href; path: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { href: '/', path: '/', label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
  { href: '/monitor', path: '/monitor', label: 'Activity', icon: 'pulse-outline', activeIcon: 'pulse' },
  { href: '/stress', path: '/stress', label: 'Benchmarks', icon: 'speedometer-outline', activeIcon: 'speedometer' },
  { href: '/hardware', path: '/hardware', label: 'Device', icon: 'phone-portrait-outline', activeIcon: 'phone-portrait' },
  { href: '/reports', path: '/reports', label: 'Reports', icon: 'documents-outline', activeIcon: 'documents' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { isDark, updatePreferences } = useSettings();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 1000;
  const compact = width < 600;
  const modal = ['/settings', '/privacy', '/paywall'].includes(pathname);
  const active = navigation.find(item => item.path === '/' ? pathname === '/' || pathname === '/index' : pathname.startsWith(item.path));
  useEffect(() => { if (typeof document !== 'undefined') document.title = `Veylo · ${modal ? pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2) : active?.label || 'Report'}`; }, [active?.label, modal, pathname]);
  const toggleTheme = () => { void updatePreferences({ theme: isDark ? 'light' : 'dark' }); };
  const utility = <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>{wide && <Badge tone="good" dot>Local-first</Badge>}<IconButton icon={isDark ? 'sunny-outline' : 'moon-outline'} label={isDark ? 'Switch to light appearance' : 'Switch to dark appearance'} onPress={toggleTheme} /><IconButton icon="settings-outline" label="Open settings" onPress={() => router.push('/settings')} /></View>;
  return <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: c.background, paddingTop: insets.top }}>
    {wide ? <View style={{ width: 228, backgroundColor: c.sidebar, borderRightWidth: 1, borderColor: c.border, paddingHorizontal: 20, paddingTop: 31, paddingBottom: 20 }}>
      <Pressable accessibilityRole="link" accessibilityLabel="Veylo overview" onPress={() => router.navigate('/')} style={{ paddingHorizontal: 9, marginBottom: 43 }}><Brand /></Pressable>
      <Text style={{ color: c.textTertiary, fontSize: 9, letterSpacing: 1.7, fontWeight: '600', paddingHorizontal: 14, marginBottom: 15 }}>YOUR WORKSPACE</Text>
      <View style={{ gap: 7 }}>{navigation.map(item => {
        const selected = active?.path === item.path;
        return <Pressable key={item.path} accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => router.navigate(item.href)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, minHeight: 46, borderRadius: 10, backgroundColor: selected ? c.primaryDim : pressed ? c.surfaceElevated : 'transparent' })}><Ionicons name={selected ? item.activeIcon : item.icon} size={19} color={selected ? c.primary : c.textSecondary} /><Text style={{ fontSize: 13, fontWeight: selected ? '600' : '400', color: selected ? c.primary : c.textSecondary }}>{item.label}</Text>{selected && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary, marginLeft: 'auto' }} />}</Pressable>;
      })}</View>
      <View style={{ flex: 1 }} />
      <View style={{ backgroundColor: c.surfaceElevated, borderRadius: 13, padding: 16, gap: 10, marginBottom: 20 }}><Ionicons name="leaf-outline" size={23} color={c.primary} /><Text style={{ fontSize: 13, fontWeight: '600', lineHeight: 20 }}>Small check-ins.{'\n'}A little more clarity.</Text><Text style={{ fontSize: 11, color: c.textSecondary, lineHeight: 17 }}>Get to know the device that goes everywhere with you.</Text></View>
      <Pressable accessibilityRole="link" onPress={() => router.push('/settings')} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13 }}><Ionicons name="settings-outline" size={18} color={c.textSecondary} /><Text style={{ fontSize: 12, color: c.textSecondary }}>Settings</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13 }}><Ionicons name="shield-checkmark-outline" size={18} color={c.textSecondary} /><Text style={{ fontSize: 12, color: c.textSecondary }}>Privacy & your data</Text></Pressable>
      <View style={{ borderTopWidth: 1, borderColor: c.border, marginTop: 15, paddingTop: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><BrandLogo size={20} transparent /><Text style={{ fontSize: 10, color: c.textTertiary }}>Veylo 1.0 · A fresh perspective</Text></View>
    </View> : <View style={{ paddingHorizontal: compact ? 18 : 24, height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.sidebar }}><Pressable accessibilityRole="link" accessibilityLabel="Veylo overview" onPress={() => router.navigate('/')}><Brand compact /></Pressable>{utility}</View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      {wide && <View style={{ height: 77, minHeight: 77, paddingHorizontal: 34, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.background }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><Text style={{ fontSize: 12, color: c.textTertiary }}>Your workspace</Text><Ionicons name="chevron-forward" size={12} color={c.textTertiary} /><Text style={{ fontSize: 12, fontWeight: '600' }}>{modal ? pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2) : active?.label || 'Report'}</Text></View>{utility}</View>}
      <View style={{ flex: 1, minHeight: 0, backgroundColor: c.background }}>{children}</View>
      {!wide && !modal && <View style={{ flexDirection: 'row', backgroundColor: c.sidebar, borderTopWidth: 1, borderColor: c.border, paddingTop: 9, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 5 }}>{navigation.map(item => {
        const selected = active?.path === item.path;
        return <Pressable key={item.path} accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => router.navigate(item.href)} style={{ flex: 1, alignItems: 'center', gap: 5, minHeight: 45, justifyContent: 'center' }}><Ionicons name={selected ? item.activeIcon : item.icon} size={21} color={selected ? c.primary : c.textTertiary} /><Text style={{ fontSize: compact ? 9 : 11, color: selected ? c.primary : c.textSecondary, fontWeight: selected ? '600' : '400' }}>{item.label}</Text></Pressable>;
      })}</View>}
    </View>
  </View>;
}
