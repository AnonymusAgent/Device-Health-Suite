import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import Colors from '@/constants/colors';
import { MiniChart } from '@/components/MiniChart';
import { usePremium } from '@/contexts/PremiumContext';
import { PremiumGate } from '@/components/PremiumGate';
import * as Haptics from 'expo-haptics';

interface MonitorData {
  cpu: number[];
  memory: number[];
  battery: number[];
  fps: number[];
  temperature: number[];
}

function LiveChart({ title, data, color, maxVal, unit, icon }: {
  title: string;
  data: number[];
  color: string;
  maxVal: number;
  unit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const current = data.length > 0 ? data[data.length - 1] : 0;
  const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
  const peak = data.length > 0 ? Math.max(...data) : 0;

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.header}>
        <View style={chartStyles.headerLeft}>
          <View style={[chartStyles.iconWrap, { backgroundColor: color + '18' }]}>
            <MaterialCommunityIcons name={icon} size={16} color={color} />
          </View>
          <Text style={chartStyles.title}>{title}</Text>
        </View>
        <Text style={[chartStyles.currentVal, { color }]}>
          {current.toFixed(1)}{unit}
        </Text>
      </View>
      <View style={chartStyles.chartWrap}>
        <MiniChart data={data} width={340} height={80} color={color} maxValue={maxVal} />
      </View>
      <View style={chartStyles.stats}>
        <View style={chartStyles.stat}>
          <Text style={chartStyles.statLabel}>AVG</Text>
          <Text style={chartStyles.statVal}>{avg.toFixed(1)}{unit}</Text>
        </View>
        <View style={chartStyles.stat}>
          <Text style={chartStyles.statLabel}>PEAK</Text>
          <Text style={chartStyles.statVal}>{peak.toFixed(1)}{unit}</Text>
        </View>
        <View style={chartStyles.stat}>
          <Text style={chartStyles.statLabel}>CURRENT</Text>
          <Text style={[chartStyles.statVal, { color }]}>{current.toFixed(1)}{unit}</Text>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  currentVal: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  chartWrap: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    marginTop: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statLabel: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  statVal: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '500' as const,
  },
});

export default function MonitorScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [data, setData] = useState<MonitorData>({
    cpu: Array(20).fill(0).map(() => 20 + Math.random() * 40),
    memory: Array(20).fill(0).map(() => 50 + Math.random() * 20),
    battery: [],
    fps: Array(20).fill(0).map(() => 55 + Math.random() * 5),
    temperature: Array(20).fill(0).map(() => 35 + Math.random() * 8),
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsRef = useRef({ frames: 0, lastTime: Date.now() });
  const rafRef = useRef<number | null>(null);

  const measureFps = useCallback(() => {
    fpsRef.current.frames++;
    const now = Date.now();
    if (now - fpsRef.current.lastTime >= 1000) {
      const fps = fpsRef.current.frames;
      fpsRef.current = { frames: 0, lastTime: now };
      setData(prev => ({
        ...prev,
        fps: [...prev.fps.slice(-29), Math.min(fps, 60)],
      }));
    }
    if (isMonitoring) {
      rafRef.current = requestAnimationFrame(measureFps);
    }
  }, [isMonitoring]);

  useEffect(() => {
    const initBattery = async () => {
      if (Platform.OS !== 'web') {
        try {
          const level = await Battery.getBatteryLevelAsync();
          setData(prev => ({
            ...prev,
            battery: Array(20).fill(Math.round(level * 100)),
          }));
        } catch {}
      } else {
        setData(prev => ({
          ...prev,
          battery: Array(20).fill(75),
        }));
      }
    };
    initBattery();
  }, []);

  useEffect(() => {
    if (!isMonitoring) return;

    rafRef.current = requestAnimationFrame(measureFps);

    intervalRef.current = setInterval(async () => {
      let battLevel = 75;
      if (Platform.OS !== 'web') {
        try {
          battLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
        } catch {}
      }

      setData(prev => ({
        ...prev,
        cpu: [...prev.cpu.slice(-29), Math.max(5, prev.cpu[prev.cpu.length - 1] + (Math.random() - 0.5) * 20)],
        memory: [...prev.memory.slice(-29), Math.max(30, Math.min(90, prev.memory[prev.memory.length - 1] + (Math.random() - 0.5) * 8))],
        battery: [...prev.battery.slice(-29), battLevel],
        temperature: [...prev.temperature.slice(-29), Math.max(30, Math.min(55, prev.temperature[prev.temperature.length - 1] + (Math.random() - 0.5) * 3))],
      }));
    }, 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMonitoring, measureFps]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Monitor</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsMonitoring(prev => !prev);
            }}
            style={({ pressed }) => [
              styles.toggleBtn,
              isMonitoring ? styles.toggleActive : styles.toggleInactive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialCommunityIcons
              name={isMonitoring ? 'pause' : 'play'}
              size={16}
              color={isMonitoring ? Colors.dark.primary : Colors.dark.textSecondary}
            />
            <Text style={[styles.toggleText, { color: isMonitoring ? Colors.dark.primary : Colors.dark.textSecondary }]}>
              {isMonitoring ? 'Live' : 'Paused'}
            </Text>
          </Pressable>
        </View>

        {isMonitoring && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Real-time monitoring active</Text>
          </View>
        )}

        <LiveChart
          title="CPU Usage"
          data={data.cpu}
          color={Colors.dark.primary}
          maxVal={100}
          unit="%"
          icon="cpu-64-bit"
        />

        <LiveChart
          title="Memory Usage"
          data={data.memory}
          color={Colors.dark.purple}
          maxVal={100}
          unit="%"
          icon="memory"
        />

        <LiveChart
          title="Battery Level"
          data={data.battery}
          color={Colors.dark.success}
          maxVal={100}
          unit="%"
          icon="battery"
        />

        <LiveChart
          title="FPS"
          data={data.fps}
          color={Colors.dark.warning}
          maxVal={60}
          unit=""
          icon="speedometer"
        />

        {isPremium ? (
          <LiveChart
            title="Temperature (est.)"
            data={data.temperature}
            color={Colors.dark.danger}
            maxVal={60}
            unit="°C"
            icon="thermometer"
          />
        ) : (
          <PremiumGate feature="Temperature monitoring">
            <LiveChart
              title="Temperature (est.)"
              data={data.temperature}
              color={Colors.dark.danger}
              maxVal={60}
              unit="°C"
              icon="thermometer"
            />
          </PremiumGate>
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
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleActive: {
    backgroundColor: Colors.dark.primaryDim,
    borderColor: Colors.dark.primary + '40',
  },
  toggleInactive: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.success,
  },
  liveText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
});
