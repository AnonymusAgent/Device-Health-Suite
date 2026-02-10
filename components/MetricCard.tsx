import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { MiniChart } from './MiniChart';

interface MetricCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  value: string;
  subtitle?: string;
  chartData?: number[];
  chartColor?: string;
  onPress?: () => void;
  badge?: string;
  badgeColor?: string;
}

export function MetricCard({
  icon,
  iconColor = Colors.dark.primary,
  title,
  value,
  subtitle,
  chartData,
  chartColor,
  onPress,
  badge,
  badgeColor = Colors.dark.success,
}: MetricCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : {},
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor + '25' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      {chartData && chartData.length > 1 && (
        <View style={styles.chartWrap}>
          <MiniChart
            data={chartData}
            width={140}
            height={32}
            color={chartColor || iconColor}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flex: 1,
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  title: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  value: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  chartWrap: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
});
