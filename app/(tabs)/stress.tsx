import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { ProgressRing } from '@/components/ProgressRing';
import { PremiumGate } from '@/components/PremiumGate';
import { usePremium } from '@/contexts/PremiumContext';
import {
  StressTestResult,
  StressTestProgress,
  runCpuStressTest,
  runMemoryStressTest,
  runBatteryStressTest,
  generateReport,
} from '@/lib/stress-tests';
import * as Haptics from 'expo-haptics';

type TestType = 'cpu-single' | 'cpu-multi' | 'memory' | 'battery';

interface TestState {
  running: boolean;
  progress: StressTestProgress | null;
  result: StressTestResult | null;
}

function StressTestCard({
  title,
  description,
  icon,
  iconColor,
  testState,
  onStart,
  onStop,
  disabled,
}: {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  testState: TestState;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}) {
  const { running, progress, result } = testState;

  const getStatusColor = () => {
    if (!result) return Colors.dark.textTertiary;
    if (result.status === 'pass') return Colors.dark.success;
    if (result.status === 'warning') return Colors.dark.warning;
    return Colors.dark.danger;
  };

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>
        <View style={cardStyles.headerText}>
          <Text style={cardStyles.title}>{title}</Text>
          <Text style={cardStyles.description}>{description}</Text>
        </View>
      </View>

      {running && progress && (
        <View style={cardStyles.progressSection}>
          <View style={cardStyles.progressRow}>
            <ProgressRing
              progress={progress.progress}
              size={64}
              strokeWidth={5}
              color={iconColor}
              label={`${Math.round(progress.progress * 100)}%`}
            />
            <View style={cardStyles.progressInfo}>
              <Text style={cardStyles.metricLabel}>{progress.currentMetric}</Text>
              <Text style={[cardStyles.metricValue, { color: iconColor }]}>{progress.currentValue}</Text>
              {progress.temperature && (
                <Text style={cardStyles.tempText}>
                  Temp: {progress.temperature}°C
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {result && !running && (
        <View style={cardStyles.resultSection}>
          <View style={cardStyles.resultHeader}>
            <View style={[cardStyles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <MaterialCommunityIcons
                name={result.status === 'pass' ? 'check-circle' : result.status === 'warning' ? 'alert-circle' : 'close-circle'}
                size={14}
                color={getStatusColor()}
              />
              <Text style={[cardStyles.statusText, { color: getStatusColor() }]}>
                {result.status.toUpperCase()}
              </Text>
            </View>
            <Text style={cardStyles.scoreText}>Score: {result.score}/100</Text>
          </View>
          {result.metrics.map((m, i) => (
            <View key={i} style={cardStyles.metricRow}>
              <Text style={cardStyles.metricRowLabel}>{m.label}</Text>
              <Text style={cardStyles.metricRowValue}>{m.value}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (running) onStop();
          else onStart();
        }}
        disabled={disabled && !running}
        style={({ pressed }) => [
          cardStyles.button,
          running ? cardStyles.stopButton : {},
          (disabled && !running) ? { opacity: 0.5 } : {},
          pressed ? { opacity: 0.8 } : {},
        ]}
      >
        {running ? (
          <LinearGradient
            colors={[Colors.dark.danger, '#CC3833']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.buttonGradient}
          >
            <MaterialCommunityIcons name="stop" size={16} color="#FFF" />
            <Text style={cardStyles.buttonText}>Stop Test</Text>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={[iconColor, iconColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.buttonGradient}
          >
            <MaterialCommunityIcons name="play" size={16} color="#FFF" />
            <Text style={cardStyles.buttonText}>
              {result ? 'Run Again' : 'Start Test'}
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
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
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  description: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 12,
  },
  progressInfo: {
    flex: 1,
  },
  metricLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  tempText: {
    color: Colors.dark.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  resultSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  scoreText: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  metricRowLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  metricRowValue: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  button: {
    margin: 16,
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stopButton: {},
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

export default function StressScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const stopFlagRef = useRef(false);

  const [tests, setTests] = useState<Record<TestType, TestState>>({
    'cpu-single': { running: false, progress: null, result: null },
    'cpu-multi': { running: false, progress: null, result: null },
    'memory': { running: false, progress: null, result: null },
    'battery': { running: false, progress: null, result: null },
  });

  const isAnyRunning = Object.values(tests).some(t => t.running);

  const updateTest = useCallback((type: TestType, update: Partial<TestState>) => {
    setTests(prev => ({ ...prev, [type]: { ...prev[type], ...update } }));
  }, []);

  const runTest = useCallback(async (type: TestType) => {
    stopFlagRef.current = false;
    updateTest(type, { running: true, progress: null, result: null });

    const onProgress = (p: StressTestProgress) => {
      updateTest(type, { progress: p });
    };
    const shouldStop = () => stopFlagRef.current;
    const duration = 10000;

    let result: StressTestResult;

    switch (type) {
      case 'cpu-single':
        result = await runCpuStressTest('single', duration, onProgress, shouldStop);
        break;
      case 'cpu-multi':
        result = await runCpuStressTest('multi', duration, onProgress, shouldStop);
        break;
      case 'memory':
        result = await runMemoryStressTest(duration, onProgress, shouldStop);
        break;
      case 'battery':
        result = await runBatteryStressTest(duration, onProgress, shouldStop);
        break;
    }

    Haptics.notificationAsync(
      result.status === 'pass' ? Haptics.NotificationFeedbackType.Success :
      result.status === 'warning' ? Haptics.NotificationFeedbackType.Warning :
      Haptics.NotificationFeedbackType.Error
    );
    updateTest(type, { running: false, result });
  }, [updateTest]);

  const stopTest = useCallback(() => {
    stopFlagRef.current = true;
  }, []);

  const exportResults = useCallback(async () => {
    const results = Object.values(tests).map(t => t.result).filter((r): r is StressTestResult => r !== null);
    if (results.length === 0) {
      Alert.alert('No Results', 'Run at least one stress test before exporting.');
      return;
    }
    const report = generateReport(results);
    try {
      await Share.share({ message: report, title: 'DevicePulse Stress Test Report' });
    } catch {}
  }, [tests]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const stressContent = (
    <>
      <StressTestCard
        title="CPU Single-Core"
        description="Tests single-thread performance with intensive calculations"
        icon="cpu-64-bit"
        iconColor={Colors.dark.primary}
        testState={tests['cpu-single']}
        onStart={() => runTest('cpu-single')}
        onStop={stopTest}
        disabled={isAnyRunning}
      />
      <StressTestCard
        title="CPU Multi-Core"
        description="Tests multi-threaded computation throughput"
        icon="chip"
        iconColor="#5AC8FA"
        testState={tests['cpu-multi']}
        onStart={() => runTest('cpu-multi')}
        onStop={stopTest}
        disabled={isAnyRunning}
      />
      <StressTestCard
        title="Memory Stress"
        description="Tests RAM allocation stability and throughput"
        icon="memory"
        iconColor={Colors.dark.purple}
        testState={tests['memory']}
        onStart={() => runTest('memory')}
        onStop={stopTest}
        disabled={isAnyRunning}
      />
      <StressTestCard
        title="Battery Endurance"
        description="Simulates high-load scenarios to test battery drain rate"
        icon="battery-alert"
        iconColor={Colors.dark.secondary}
        testState={tests['battery']}
        onStart={() => runTest('battery')}
        onStop={stopTest}
        disabled={isAnyRunning}
      />
    </>
  );

  const hasResults = Object.values(tests).some(t => t.result);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Stress Test</Text>
          {isPremium && hasResults && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                exportResults();
              }}
              style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name="export-variant" size={18} color={Colors.dark.primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.warningCard}>
          <MaterialCommunityIcons name="shield-check" size={18} color={Colors.dark.success} />
          <Text style={styles.warningText}>
            Safety limits are active. Tests will auto-stop if thresholds are exceeded.
          </Text>
        </View>

        {isPremium ? stressContent : (
          <PremiumGate feature="Stress testing">
            {stressContent}
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
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.dark.successDim,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.2)',
  },
  warningText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
