import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import Colors from '@/constants/colors';
import { MetricCard } from '@/components/MetricCard';
import { ProgressRing } from '@/components/ProgressRing';
import { getDeviceInfo, formatBytes, formatPercentage, DeviceHardwareInfo } from '@/lib/device-info';
import { usePremium } from '@/contexts/PremiumContext';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<DeviceHardwareInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cpuHistory, setCpuHistory] = useState<number[]>([30, 35, 28, 42, 38, 45, 40, 33, 50, 44]);
  const [ramHistory, setRamHistory] = useState<number[]>([55, 58, 52, 60, 57, 62, 59, 55, 63, 61]);
  const [batteryHistory, setBatteryHistory] = useState<number[]>([]);
  const [healthScore, setHealthScore] = useState(0);
  const { isPremium, showPaywall } = usePremium();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInfo = useCallback(async () => {
    const data = await getDeviceInfo();
    setInfo(data);

    const battLevel = Math.round(data.battery.level * 100);
    const storageUsePct = data.storage.totalDisk > 0 ? (data.storage.usedDisk / data.storage.totalDisk) : 0.5;
    const score = Math.round(
      (battLevel * 0.3) +
      ((1 - storageUsePct) * 100 * 0.25) +
      (data.network.isConnected ? 25 : 0) +
      20
    );
    setHealthScore(Math.min(score, 100));

    if (batteryHistory.length === 0) {
      setBatteryHistory(Array(10).fill(battLevel));
    }
  }, []);

  useEffect(() => {
    loadInfo();
    intervalRef.current = setInterval(() => {
      setCpuHistory(prev => {
        const next = [...prev.slice(-19), 20 + Math.random() * 60];
        return next;
      });
      setRamHistory(prev => {
        const next = [...prev.slice(-19), 45 + Math.random() * 30];
        return next;
      });
      setBatteryHistory(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const next = [...prev.slice(-19), Math.max(0, last - Math.random() * 0.3)];
        return next;
      });
    }, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadInfo();
    setRefreshing(false);
  }, [loadInfo]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const getHealthColor = () => {
    if (healthScore >= 80) return Colors.dark.success;
    if (healthScore >= 50) return Colors.dark.secondary;
    return Colors.dark.danger;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.deviceName}>{info?.device.modelName || 'Loading...'}</Text>
            <Text style={styles.deviceSub}>
              {info?.device.osName} {info?.device.osVersion} {info?.device.isDevice ? '' : '(Simulator)'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (!isPremium) showPaywall();
            }}
            style={({ pressed }) => [styles.premiumBtn, pressed && { opacity: 0.8 }]}
          >
            <MaterialCommunityIcons
              name={isPremium ? 'crown' : 'crown-outline'}
              size={20}
              color={isPremium ? Colors.dark.secondary : Colors.dark.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.healthRow}>
          <ProgressRing
            progress={healthScore / 100}
            size={100}
            strokeWidth={8}
            color={getHealthColor()}
            label={`${healthScore}`}
            sublabel="Health"
          />
          <View style={styles.healthInfo}>
            <Text style={styles.healthTitle}>Device Health</Text>
            <Text style={styles.healthDesc}>
              {healthScore >= 80 ? 'Excellent condition' :
               healthScore >= 50 ? 'Good condition, some optimization recommended' :
               'Needs attention'}
            </Text>
            <View style={styles.healthTags}>
              <View style={[styles.tag, { backgroundColor: Colors.dark.successDim }]}>
                <Text style={[styles.tagText, { color: Colors.dark.success }]}>
                  {info?.network.isConnected ? 'Online' : 'Offline'}
                </Text>
              </View>
              <View style={[styles.tag, { backgroundColor: Colors.dark.primaryDim }]}>
                <Text style={[styles.tagText, { color: Colors.dark.primary }]}>
                  {info?.battery.state || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>System Overview</Text>

        <View style={styles.grid}>
          <MetricCard
            icon="cpu-64-bit"
            iconColor={Colors.dark.primary}
            title="CPU"
            value={`${cpuHistory[cpuHistory.length - 1]?.toFixed(0) || 0}%`}
            subtitle={info?.processor.estimatedFrequency || ''}
            chartData={cpuHistory}
            chartColor={Colors.dark.primary}
          />
          <MetricCard
            icon="memory"
            iconColor={Colors.dark.purple}
            title="RAM"
            value={info ? formatBytes(info.memory.estimatedUsed) : '--'}
            subtitle={info ? `of ${formatBytes(info.memory.totalRam)}` : ''}
            chartData={ramHistory}
            chartColor={Colors.dark.purple}
          />
        </View>
        <View style={styles.grid}>
          <MetricCard
            icon="harddisk"
            iconColor={Colors.dark.secondary}
            title="Storage"
            value={info ? formatBytes(info.storage.usedDisk) : '--'}
            subtitle={info ? `of ${formatBytes(info.storage.totalDisk)}` : ''}
            badge={info && info.storage.totalDisk > 0
              ? `${Math.round((info.storage.usedDisk / info.storage.totalDisk) * 100)}%`
              : undefined}
            badgeColor={Colors.dark.secondary}
          />
          <MetricCard
            icon="battery-charging"
            iconColor={Colors.dark.success}
            title="Battery"
            value={info ? formatPercentage(info.battery.level) : '--'}
            subtitle={info?.battery.state || ''}
            chartData={batteryHistory}
            chartColor={Colors.dark.success}
          />
        </View>
        <View style={styles.grid}>
          <MetricCard
            icon="wifi"
            iconColor="#5AC8FA"
            title="Network"
            value={info?.network.type || '--'}
            subtitle={info?.network.isConnected ? 'Connected' : 'Disconnected'}
            badge={info?.network.isConnected ? 'Active' : 'Off'}
            badgeColor={info?.network.isConnected ? Colors.dark.success : Colors.dark.danger}
          />
          <MetricCard
            icon="monitor-screenshot"
            iconColor={Colors.dark.warning}
            title="Display"
            value={info ? `${info.display.pixelWidth}x${info.display.pixelHeight}` : '--'}
            subtitle={info ? `${info.display.dpi} DPI` : ''}
          />
        </View>

        {!isPremium && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              showPaywall();
            }}
            style={({ pressed }) => [styles.promoCard, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="crown" size={22} color={Colors.dark.secondary} />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Unlock Premium</Text>
              <Text style={styles.promoDesc}>Stress tests, advanced graphs, and exportable reports</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.dark.textTertiary} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  deviceName: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  deviceSub: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  premiumBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 20,
  },
  healthInfo: {
    flex: 1,
  },
  healthTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  healthDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  healthTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.secondaryDim,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.2)',
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    color: Colors.dark.secondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  promoDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
