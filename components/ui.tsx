import React from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, Text as RNText, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useSettings } from '@/contexts/SettingsContext';
export type IconName = keyof typeof Ionicons.glyphMap;
export type Tone = 'good' | 'info' | 'warning' | 'danger' | 'neutral';

export function Text({ style, ...props }: TextProps) {
  const colors = useColors();
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const weight = String(flat.fontWeight || '400');
  const family = ['700', '800', '900', 'bold'].includes(weight) ? 'SpaceGrotesk_700Bold' : ['600', '500'].includes(weight) ? 'SpaceGrotesk_600SemiBold' : 'SpaceGrotesk_400Regular';
  return <RNText {...props} style={[{ color: colors.text, fontFamily: family }, style]} />;
}
export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, small, style, accessibilityLabel }: {
  label: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const c = useColors();
  const { isDark } = useSettings();
  const color = variant === 'primary' ? (!isDark ? '#FFFFFF' : '#102A20') : variant === 'danger' ? c.danger : variant === 'ghost' ? c.textSecondary : c.text;
  const background = variant === 'primary' ? c.primary : variant === 'danger' ? c.dangerDim : variant === 'ghost' ? 'transparent' : c.surface;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [{ minHeight: small ? 40 : 46, paddingHorizontal: small ? 13 : 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: variant === 'secondary' ? c.border : 'transparent', backgroundColor: background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }, style]}>
    {loading ? <ActivityIndicator size="small" color={color} /> : icon ? <Ionicons name={icon} size={17} color={color} /> : null}
    <Text style={{ color, fontSize: 13, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}
export function IconButton({ icon, label, onPress, disabled, style }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}><Ionicons name={icon} size={19} color={c.textSecondary} /></Pressable>;
}
export function Card({ children, style, padded = true, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; testID?: string }) {
  const c = useColors();
  return <View testID={testID} style={[{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 17, padding: padded ? 22 : 0, overflow: 'hidden' }, Platform.OS === 'web' ? { boxShadow: `0 3px 12px ${c.shadow}04` } : null, style]}>{children}</View>;
}
export function IconTile({ icon, tone = 'good', size = 40 }: { icon: IconName; tone?: Tone; size?: number }) {
  const c = useColors();
  const colors = { good: [c.primaryDim, c.primary], info: [c.blueDim, c.blue], warning: [c.warningDim, c.warning], danger: [c.dangerDim, c.danger], neutral: [c.surfaceElevated, c.textSecondary] };
  return <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors[tone][0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={size * 0.48} color={colors[tone][1]} /></View>;
}
export function Badge({ children, tone = 'neutral', dot = false }: { children: React.ReactNode; tone?: Tone; dot?: boolean }) {
  const c = useColors();
  const colors = { good: [c.successDim, c.success], info: [c.blueDim, c.blue], warning: [c.warningDim, c.warning], danger: [c.dangerDim, c.danger], neutral: [c.surfaceElevated, c.textSecondary] };
  return <View style={{ backgroundColor: colors[tone][0], paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
    {dot && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[tone][1] }} />}
    <Text style={{ color: colors[tone][1], fontSize: 11, fontWeight: '600' }}>{children}</Text>
  </View>;
}
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle: string; actions?: React.ReactNode }) {
  const c = useColors();
  return <View style={{ gap: 18, marginBottom: 26 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
    <View style={{ flex: 1, minWidth: 220, gap: 6 }}>{eyebrow ? <Text style={{ fontSize: 10, letterSpacing: 1.7, color: c.primary, fontWeight: '700' }}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1 }}>{title}</Text><Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>{subtitle}</Text></View>
    {actions ? <View style={{ flexDirection: 'row', gap: 9, flexWrap: 'wrap' }}>{actions}</View> : null}
  </View></View>;
}
export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const c = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}><View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>{subtitle ? <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18 }}>{subtitle}</Text> : null}</View>{action}</View>;
}
export function Notice({ children, tone = 'info', icon = 'information-circle-outline' }: { children: React.ReactNode; tone?: Tone; icon?: IconName }) {
  const c = useColors();
  const bg = tone === 'warning' || tone === 'danger' ? c.warningDim : c.surfaceElevated;
  return <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: bg, padding: 14, borderRadius: 11 }}><Ionicons name={icon} size={18} color={tone === 'danger' ? c.danger : c.textSecondary} style={{ marginTop: 1 }} /><Text style={{ flex: 1, fontSize: 12, lineHeight: 19, color: c.textSecondary }}>{children}</Text></View>;
}
export function EmptyState({ icon = 'documents-outline', title, description, action }: { icon?: IconName; title: string; description: string; action?: React.ReactNode }) {
  const c = useColors();
  return <View style={{ alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20, gap: 12 }}><IconTile icon={icon} tone="neutral" size={52} /><Text style={{ fontSize: 17, fontWeight: '700', textAlign: 'center' }}>{title}</Text><Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 370 }}>{description}</Text>{action ? <View style={{ marginTop: 5 }}>{action}</View> : null}</View>;
}
export function SegmentedControl<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  const c = useColors();
  return <View accessibilityRole="radiogroup" aria-label={label} style={{ flexDirection: 'row', backgroundColor: c.surfaceElevated, padding: 4, borderRadius: 10, gap: 2, alignSelf: 'flex-start' }}>
    {options.map(option => <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} aria-checked={value === option.value} accessibilityLabel={option.label} onPress={() => onChange(option.value)} style={{ minHeight: 34, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 7, backgroundColor: value === option.value ? c.surface : 'transparent', justifyContent: 'center' }}><Text style={{ fontSize: 12, fontWeight: value === option.value ? '600' : '400', color: value === option.value ? c.text : c.textSecondary }}>{option.label}</Text></Pressable>)}
  </View>;
}
export function ConfirmDialog({ visible, title, description, confirmLabel = 'Confirm', onConfirm, onCancel, destructive, busy }: { visible: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean; busy?: boolean }) {
  const c = useColors();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}><View style={{ flex: 1, backgroundColor: '#0C201BB3', justifyContent: 'center', alignItems: 'center', padding: 24 }}><View accessibilityViewIsModal aria-modal role="dialog" aria-label={title} style={{ backgroundColor: c.surface, borderRadius: 20, padding: 26, width: '100%', maxWidth: 430, gap: 15 }}><IconTile icon={destructive ? 'trash-outline' : 'information-circle-outline'} tone={destructive ? 'danger' : 'info'} /><Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700' }}>{title}</Text><Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 22 }}>{description}</Text><View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8, flexWrap: 'wrap' }}><Button label="Cancel" variant="secondary" onPress={onCancel} disabled={busy} /><Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} /></View></View></View></Modal>;
}
export function Page({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const c = useColors();
  const padding = useWindowDimensions().width < 600 ? 18 : 32;
  return scroll ? <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding, paddingBottom: 40, width: '100%', maxWidth: 1240, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>{children}</ScrollView> : <View style={{ flex: 1, padding, width: '100%', maxWidth: 1240, alignSelf: 'center', backgroundColor: c.background }}>{children}</View>;
}
