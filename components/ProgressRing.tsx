import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/contexts/SettingsContext';
import { Text } from './ui';
export function ProgressRing({ progress, size, strokeWidth = 6, color, label, sublabel }: { progress: number; size: number; strokeWidth?: number; color?: string; label?: string; sublabel?: string }) {
  const c = useColors();
  const safe = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const radius = Math.max(1, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  return <View accessibilityRole="progressbar" accessibilityLabel={sublabel || label || 'Progress'} accessibilityValue={{ min: 0, max: 100, now: Math.round(safe * 100) }} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}><Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.border} strokeWidth={strokeWidth} fill="none" /><Circle cx={size / 2} cy={size / 2} r={radius} stroke={color || c.primary} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe)} strokeLinecap="round" /></Svg>{label && <Text style={{ fontSize: size * 0.22, fontWeight: '700' }}>{label}</Text>}{sublabel && <Text style={{ fontSize: size * 0.1, color: c.textSecondary }}>{sublabel}</Text>}</View>;
}
