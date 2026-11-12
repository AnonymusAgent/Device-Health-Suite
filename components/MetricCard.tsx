import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/contexts/SettingsContext';
import { Badge, Card, IconTile, Text, type IconName, type Tone } from './ui';
export function MetricCard({ icon, title, value, subtitle, badge, tone = 'good', unavailable }: { icon: IconName; title: string; value: string; subtitle: string; badge: string; tone?: Tone; unavailable?: boolean }) {
  const c = useColors();
  return <Pressable accessibilityRole="link" accessibilityLabel={`${title}: ${value}. ${subtitle}. View device details`} onPress={() => router.push('/hardware')} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}><Card style={{ gap: 17, minHeight: 188, height: '100%' }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: '600' }}>{title}</Text><IconTile icon={icon} tone={tone} size={33} /></View><View style={{ gap: 5 }}><Text style={{ fontSize: unavailable ? 27 : 30, fontWeight: '700', letterSpacing: -1 }}>{value}</Text><Text style={{ fontSize: 11, lineHeight: 17, color: c.textSecondary }}>{subtitle}</Text></View><Badge tone={unavailable ? 'neutral' : tone}>{badge}</Badge></Card></Pressable>;
}
