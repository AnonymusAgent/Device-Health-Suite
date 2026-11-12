import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/AppShell';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PremiumProvider } from '@/contexts/PremiumContext';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
function Navigation() {
  const { isDark, preferences } = useSettings();
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><AppShell><Stack screenOptions={{ headerShown: false, animation: preferences.reduceMotion ? 'none' : 'fade', contentStyle: { backgroundColor: isDark ? '#111C19' : '#F6F8F7' } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="settings" /><Stack.Screen name="privacy" /><Stack.Screen name="reports/[id]" /><Stack.Screen name="paywall" options={{ presentation: 'modal' }} /></Stack></AppShell></>;
}
export default function RootLayout() {
  const [loaded, fontError] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  useEffect(() => { if (loaded || fontError) void SplashScreen.hideAsync().catch(() => undefined); }, [loaded, fontError]);
  if (!loaded && !fontError) return null;
  return <SafeAreaProvider><GestureHandlerRootView style={{ flex: 1 }}><SettingsProvider><ReportsProvider><SessionProvider><PremiumProvider><ToastProvider><ErrorBoundary><Navigation /></ErrorBoundary></ToastProvider></PremiumProvider></SessionProvider></ReportsProvider></SettingsProvider></GestureHandlerRootView></SafeAreaProvider>;
}
