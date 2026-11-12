import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from './ui';
import { useColors, useSettings } from '@/contexts/SettingsContext';
export function BrandLogo({ size = 38, transparent = false }: { size?: number; transparent?: boolean }) {
  const c = useColors();
  const { isDark } = useSettings();
  const onLight = !isDark;
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Veylo pulse logo">{!transparent && <Rect width={64} height={64} rx={18} fill={onLight ? '#11685B' : '#8DCCB0'} />}<Path d="M15 24h7l7 19 8-23 6 16h6" fill="none" stroke={transparent ? c.primary : onLight ? '#DCF6BA' : '#173C2C'} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={49} cy={18} r={3} fill={transparent ? c.primary : onLight ? '#DCF6BA' : '#173C2C'} /></Svg>;
}
export function Brand({ compact = false }: { compact?: boolean }) {
  const c = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><BrandLogo size={compact ? 32 : 39} /><View><Text style={{ fontSize: compact ? 26 : 31, fontWeight: '700', letterSpacing: -1.5, lineHeight: compact ? 31 : 36 }}>veylo</Text>{!compact && <Text style={{ fontSize: 8, letterSpacing: 1.5, color: c.textSecondary, marginTop: 1 }}>DEVICE WELLBEING</Text>}</View></View>;
}
