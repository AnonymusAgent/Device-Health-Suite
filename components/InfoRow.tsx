import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
  borderBottom?: boolean;
}

export function InfoRow({ label, value, valueColor, borderBottom = true }: InfoRowProps) {
  return (
    <View style={[styles.row, borderBottom && styles.border]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'right',
    maxWidth: '60%' as any,
  },
});
