import React from 'react';
import { View } from 'react-native';
import { useColors } from '@/contexts/SettingsContext';
import { Text } from './ui';
export function InfoRow({ label, value, valueColor, borderBottom = true }: { label: string; value: string; valueColor?: string; borderBottom?: boolean }) {
  const c = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, paddingVertical: 12, borderBottomWidth: borderBottom ? 1 : 0, borderColor: c.border }}><Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text><Text style={{ color: valueColor || c.text, fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1.3, lineHeight: 20 }}>{value}</Text></View>;
}
