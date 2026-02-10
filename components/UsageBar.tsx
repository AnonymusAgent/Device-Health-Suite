import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface UsageBarProps {
  used: number;
  total: number;
  usedLabel: string;
  totalLabel: string;
  color?: string;
}

export function UsageBar({ used, total, usedLabel, totalLabel, color = Colors.dark.primary }: UsageBarProps) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={styles.usedLabel}>{usedLabel}</Text>
        <Text style={styles.totalLabel}>{totalLabel}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.pctText}>{Math.round(pct * 100)}% used</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usedLabel: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  totalLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  barBg: {
    height: 6,
    backgroundColor: Colors.dark.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  pctText: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
});
