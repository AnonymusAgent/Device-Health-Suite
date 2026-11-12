import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Accelerometer, Barometer, Gyroscope, Magnetometer } from 'expo-sensors';
import { useColors } from '@/contexts/SettingsContext';
import { Badge, Button, Notice, SectionHeading, Text } from './ui';

type SensorState = 'unknown' | 'available' | 'unavailable' | 'exposed';
const initial: Record<string, SensorState> = { Accelerometer: 'unknown', Gyroscope: 'unknown', Magnetometer: 'unknown', Barometer: 'unknown' };
interface MotionPermissionEvent { requestPermission?: () => Promise<string> }
export function SensorPanel() {
  const c = useColors();
  const [sensors, setSensors] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [motion, setMotion] = useState<{ x: number; y: number; z: number } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const check = async () => {
    setChecking(true);
    if (Platform.OS === 'web') {
      const available = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
      setSensors({ Accelerometer: available ? 'exposed' : 'unavailable', Gyroscope: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window ? 'exposed' : 'unavailable', Magnetometer: 'unavailable', Barometer: 'unavailable' });
      setMessage('An available browser API does not guarantee physical sensor hardware. Use “Read motion” to request an actual sample.');
    } else {
      const entries = await Promise.all(Object.entries({ Accelerometer, Gyroscope, Magnetometer, Barometer }).map(async ([name, api]) => {
        try { return [name, await api.isAvailableAsync() ? 'available' : 'unavailable'] as const; } catch { return [name, 'unknown'] as const; }
      }));
      if (mounted.current) setSensors(Object.fromEntries(entries));
    }
    if (mounted.current) setChecking(false);
  };
  useEffect(() => { mounted.current = true; void check(); return () => { mounted.current = false; cleanup.current?.(); }; }, []);
  const stop = () => { cleanup.current?.(); cleanup.current = null; if (mounted.current) setTesting(false); };
  const readMotion = async () => {
    if (testing) return;
    setTesting(true); setMotion(null); setMessage('Waiting for a real motion sample…');
    try {
      if (Platform.OS === 'web') {
        const event = (window as unknown as { DeviceMotionEvent?: MotionPermissionEvent }).DeviceMotionEvent;
        if (!event) throw new Error('This browser does not expose motion events.');
        if (event.requestPermission && await event.requestPermission() !== 'granted') throw new Error('Motion access was not granted. You can change this in browser settings.');
      } else if (!await Accelerometer.isAvailableAsync()) throw new Error('No accelerometer is available on this device.');
      if (!mounted.current) return;
      let last = 0;
      let received = false;
      const receive = (value: { x: number; y: number; z: number }) => {
        if (!Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return;
        received = true;
        if (Date.now() - last < 200) return;
        last = Date.now();
        if (mounted.current) { setMotion({ x: value.x, y: value.y, z: value.z }); setMessage('Live motion sample received. This check stops after 8 seconds.'); }
      };
      let subscription: { remove: () => void } | undefined;
      const listener = (event: DeviceMotionEvent) => {
        const value = event.accelerationIncludingGravity;
        if (value?.x != null && value.y != null && value.z != null) receive({ x: value.x, y: value.y, z: value.z });
      };
      if (Platform.OS === 'web') window.addEventListener('devicemotion', listener);
      else { Accelerometer.setUpdateInterval(200); subscription = Accelerometer.addListener(receive); }
      const timer = setTimeout(() => {
        cleanup.current?.(); cleanup.current = null;
        if (mounted.current) { setTesting(false); setMessage(received ? 'Motion check finished. The sensor subscription has been removed.' : 'No motion sample was received. The device may be stationary, lack the sensor, or restrict access.'); }
      }, 8000);
      cleanup.current = () => { clearTimeout(timer); subscription?.remove(); if (Platform.OS === 'web') window.removeEventListener('devicemotion', listener); };
    } catch (error) { if (mounted.current) { setTesting(false); setMessage(error instanceof Error ? error.message : 'Motion access is unavailable.'); } }
  };
  return <View style={{ gap: 18 }}><SectionHeading title="Motion & environment" subtitle="Availability is checked, never assumed from the operating system." action={<Button label="Recheck" variant="ghost" small loading={checking} onPress={() => { void check(); }} />} />
    <View style={{ gap: 15 }}>{Object.entries(sensors).map(([name, state]) => <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 12 }}>{name}</Text><Badge tone={state === 'available' ? 'good' : state === 'exposed' ? 'info' : 'neutral'}>{state === 'available' ? 'Available' : state === 'exposed' ? 'API exposed' : state === 'unknown' ? 'Not checked' : 'Not exposed'}</Badge></View>)}{['Light sensor', 'Proximity', 'CPU temperature'].map(name => <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 12 }}>{name}</Text><Badge>No supported API</Badge></View>)}</View>
    {motion && <View style={{ backgroundColor: c.surfaceElevated, padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>{Object.entries(motion).map(([axis, value]) => <View key={axis} style={{ gap: 5 }}><Text style={{ fontSize: 10, color: c.textSecondary }}>{axis.toUpperCase()} · {Platform.OS === 'web' ? 'm/s²' : 'g'}</Text><Text style={{ fontSize: 17, fontWeight: '600' }}>{value.toFixed(3)}</Text></View>)}</View>}
    <Button label={testing ? 'Stop motion check' : 'Read motion'} icon={testing ? 'stop-outline' : 'phone-portrait-outline'} variant="secondary" loading={checking} onPress={testing ? stop : () => { void readMotion(); }} />
    {message && <Notice>{message}</Notice>}
    <Text style={{ fontSize: 10, color: c.textTertiary, lineHeight: 17 }}>Motion access is requested only when you tap “Read motion.” Sensor samples are not saved or uploaded. Native accelerometer values use g; browser motion uses m/s².</Text>
  </View>;
}
