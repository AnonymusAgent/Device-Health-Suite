import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PremiumContextValue {
  isPremium: boolean;
  togglePremium: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('premium_status').then((val) => {
      if (val === 'true') setIsPremium(true);
    });
  }, []);

  const togglePremium = useCallback(() => {
    setIsPremium((prev) => {
      const next = !prev;
      AsyncStorage.setItem('premium_status', next ? 'true' : 'false');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ isPremium, togglePremium }), [isPremium, togglePremium]);

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) throw new Error('usePremium must be used within PremiumProvider');
  return context;
}
