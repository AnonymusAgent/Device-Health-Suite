import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { useColors } from './SettingsContext';
const ToastContext = createContext<{ show: (message: string, error?: boolean) => void } | null>(null);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const value = useMemo(() => ({ show }), [show]);
  return <ToastContext.Provider value={value}><View style={{ flex: 1 }}>{children}{toast && <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ position: 'absolute', bottom: Platform.OS === 'web' ? 25 : 100, right: 24, left: Platform.OS === 'web' ? undefined : 24, maxWidth: 440, alignSelf: 'flex-end', backgroundColor: c.text, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 8, boxShadow: '0 6px 25px #00000020' }}><Ionicons name={toast.error ? 'alert-circle' : 'checkmark-circle'} size={20} color={toast.error ? c.danger : c.background} /><Text style={{ color: c.background, fontSize: 13, flex: 1, lineHeight: 19 }}>{toast.message}</Text></View>}</View></ToastContext.Provider>;
}
export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('ToastProvider is required.'); return value; }
