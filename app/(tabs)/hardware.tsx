import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Accelerometer, Gyroscope, Magnetometer, Barometer } from 'expo-sensors';
import Colors from '@/constants/colors';
import { InfoRow } from '@/components/InfoRow';
import { UsageBar } from '@/components/UsageBar';
import { SectionHeader } from '@/components/SectionHeader';
import { getDeviceInfo, formatBytes, DeviceHardwareInfo } from '@/lib/device-info';
import * as Haptics from 'expo-haptics';

interface SensorAvailability {
  accelerometer: boolean;
  gyroscope: boolean;
  magnetometer: boolean;
  barometer: boolean;
}

function SensorStatusRow({ name, available, icon }: { name: string; available: boolean; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={sensorStyles.row}>
      <View style={[sensorStyles.iconWrap, { backgroundColor: available ? Colors.dark.successDim : Colors.dark.dangerDim }]}>
        <MaterialCommunityIcons name={icon} size={16} color={available ? Colors.dark.success : Colors.dark.danger} />
      </View>
      <Text style={sensorStyles.name}>{name}</Text>
      <View style={[sensorStyles.badge, { backgroundColor: available ? Colors.dark.successDim : Colors.dark.dangerDim }]}>
        <Text style={[sensorStyles.badgeText, { color: available ? Colors.dark.success : Colors.dark.danger }]}>
          {available ? 'Available' : 'N/A'}
        </Text>
      </View>
    </View>
  );
}

const sensorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  name: {
    color: Colors.dark.text,
    fontSize: 14,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});

export default function HardwareScreen() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<DeviceHardwareInfo | null>(null);
  const [sensors, setSensors] = useState<SensorAvailability>({
    accelerometer: false,
    gyroscope: false,
    magnetometer: false,
    barometer: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getDeviceInfo();
    setInfo(data);

    if (Platform.OS !== 'web') {
      try {
        const [accel, gyro, mag, baro] = await Promise.all([
          Accelerometer.isAvailableAsync(),
          Gyroscope.isAvailableAsync(),
          Magnetometer.isAvailableAsync(),
          Barometer.isAvailableAsync(),
        ]);
        setSensors({ accelerometer: accel, gyroscope: gyro, magnetometer: mag, barometer: baro });
      } catch {}
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

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
        <Text style={styles.screenTitle}>Hardware</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.primaryDim }]}>
              <MaterialCommunityIcons name="cellphone" size={18} color={Colors.dark.primary} />
            </View>
            <Text style={styles.cardTitle}>Device</Text>
          </View>
          <InfoRow label="Brand" value={info?.device.brand || '--'} />
          <InfoRow label="Model" value={info?.device.modelName || '--'} />
          <InfoRow label="Manufacturer" value={info?.device.manufacturer || '--'} />
          <InfoRow label="Type" value={info?.device.deviceType || '--'} />
          <InfoRow label="OS" value={`${info?.device.osName || '--'} ${info?.device.osVersion || ''}`} />
          <InfoRow label="Build" value={info?.device.osBuildId || '--'} borderBottom={false} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.primaryDim }]}>
              <MaterialCommunityIcons name="cpu-64-bit" size={18} color={Colors.dark.primary} />
            </View>
            <Text style={styles.cardTitle}>Processor</Text>
          </View>
          <InfoRow label="Architecture" value={info?.processor.architecture || '--'} />
          <InfoRow label="Cores" value={info?.processor.cores.toString() || '--'} />
          <InfoRow label="Frequency (est.)" value={info?.processor.estimatedFrequency || '--'} />
          <InfoRow
            label="Architectures"
            value={info?.device.supportedCpuArchitectures?.join(', ') || '--'}
            borderBottom={false}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.purpleDim }]}>
              <MaterialCommunityIcons name="memory" size={18} color={Colors.dark.purple} />
            </View>
            <Text style={styles.cardTitle}>Memory</Text>
          </View>
          {info && (
            <UsageBar
              used={info.memory.estimatedUsed}
              total={info.memory.totalRam}
              usedLabel={`Used: ${formatBytes(info.memory.estimatedUsed)}`}
              totalLabel={`Total: ${formatBytes(info.memory.totalRam)}`}
              color={Colors.dark.purple}
            />
          )}
          <InfoRow label="Total RAM" value={info ? formatBytes(info.memory.totalRam) : '--'} />
          <InfoRow label="Used (est.)" value={info ? formatBytes(info.memory.estimatedUsed) : '--'} />
          <InfoRow label="Free (est.)" value={info ? formatBytes(info.memory.estimatedFree) : '--'} borderBottom={false} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.secondaryDim }]}>
              <MaterialCommunityIcons name="harddisk" size={18} color={Colors.dark.secondary} />
            </View>
            <Text style={styles.cardTitle}>Storage</Text>
          </View>
          {info && info.storage.totalDisk > 0 && (
            <UsageBar
              used={info.storage.usedDisk}
              total={info.storage.totalDisk}
              usedLabel={`Used: ${formatBytes(info.storage.usedDisk)}`}
              totalLabel={`Total: ${formatBytes(info.storage.totalDisk)}`}
              color={Colors.dark.secondary}
            />
          )}
          <InfoRow label="Total" value={info ? formatBytes(info.storage.totalDisk) : '--'} />
          <InfoRow label="Used" value={info ? formatBytes(info.storage.usedDisk) : '--'} />
          <InfoRow label="Free" value={info ? formatBytes(info.storage.freeDisk) : '--'} borderBottom={false} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.warningDim }]}>
              <MaterialCommunityIcons name="monitor" size={18} color={Colors.dark.warning} />
            </View>
            <Text style={styles.cardTitle}>Display</Text>
          </View>
          <InfoRow label="Resolution" value={info ? `${info.display.pixelWidth} x ${info.display.pixelHeight}` : '--'} />
          <InfoRow label="Logical Size" value={info ? `${Math.round(info.display.width)} x ${Math.round(info.display.height)}` : '--'} />
          <InfoRow label="Scale Factor" value={info ? `${info.display.scale}x` : '--'} />
          <InfoRow label="DPI" value={info ? `${info.display.dpi}` : '--'} />
          <InfoRow label="Font Scale" value={info ? `${info.display.fontScale}x` : '--'} borderBottom={false} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.successDim }]}>
              <MaterialCommunityIcons name="battery" size={18} color={Colors.dark.success} />
            </View>
            <Text style={styles.cardTitle}>Battery</Text>
          </View>
          <InfoRow
            label="Level"
            value={info ? `${Math.round(info.battery.level * 100)}%` : '--'}
            valueColor={info && info.battery.level < 0.2 ? Colors.dark.danger : Colors.dark.success}
          />
          <InfoRow label="Status" value={info?.battery.state || '--'} />
          <InfoRow
            label="Low Power Mode"
            value={info?.battery.lowPowerMode ? 'Enabled' : 'Disabled'}
            valueColor={info?.battery.lowPowerMode ? Colors.dark.warning : Colors.dark.textSecondary}
            borderBottom={false}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(90, 200, 250, 0.15)' }]}>
              <MaterialCommunityIcons name="wifi" size={18} color="#5AC8FA" />
            </View>
            <Text style={styles.cardTitle}>Network</Text>
          </View>
          <InfoRow label="Type" value={info?.network.type || '--'} />
          <InfoRow
            label="Connected"
            value={info?.network.isConnected ? 'Yes' : 'No'}
            valueColor={info?.network.isConnected ? Colors.dark.success : Colors.dark.danger}
          />
          <InfoRow
            label="Internet"
            value={info?.network.isInternetReachable === null ? 'Unknown' : info?.network.isInternetReachable ? 'Reachable' : 'Unreachable'}
            borderBottom={false}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.dark.primaryDim }]}>
              <MaterialCommunityIcons name="access-point" size={18} color={Colors.dark.primary} />
            </View>
            <Text style={styles.cardTitle}>Sensors</Text>
          </View>
          <SensorStatusRow name="Accelerometer" available={sensors.accelerometer} icon="axis-arrow" />
          <SensorStatusRow name="Gyroscope" available={sensors.gyroscope} icon="rotate-3d-variant" />
          <SensorStatusRow name="Magnetometer" available={sensors.magnetometer} icon="magnet" />
          <SensorStatusRow name="Barometer" available={sensors.barometer} icon="gauge" />
          <SensorStatusRow name="Light Sensor" available={Platform.OS === 'android'} icon="white-balance-sunny" />
          <SensorStatusRow name="Proximity" available={Platform.OS === 'android'} icon="signal-distance-variant" />
        </View>
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
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
