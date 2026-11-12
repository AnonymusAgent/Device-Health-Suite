import React from 'react';
import { View } from 'react-native';
import { useColors } from '@/contexts/SettingsContext';
import { Text } from './ui';
export function UsageBar({ used, total, usedLabel, totalLabel, color }: { used: number; total: number; usedLabel: string; totalLabel: string; color?: string }) {
  const c = useColors();
  const valid = Number.isFinite(total) && total > 0 && Number.isFinite(used) && used >= 0;
  const ratio = valid ? Math.min(used / total, 1) : 0;
  return <View style={{ gap: 8, paddingVertical: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 12 }}>{usedLabel}</Text><Text style={{ fontSize: 12, color: c.textSecondary }}>{totalLabel}</Text></View><View accessibilityRole="progressbar" accessibilityLabel={usedLabel} accessibilityValue={valid ? { min: 0, max: 100, now: Math.round(ratio * 100) } : undefined} style={{ height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' }}><View style={{ height: '100%', width: `${ratio * 100}%`, backgroundColor: color || c.primary }} /></View><Text style={{ fontSize: 10, color: c.textTertiary }}>{valid ? `${Math.round(ratio * 100)}% used` : 'Usage unavailable'}</Text></View>;
}
