import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { router } from 'expo-router';
import type { ActionResult, PremiumContextValue } from './premium-types';
export type { ActionResult } from './premium-types';

// Web intentionally does not import the purchases SDK: its browser entry loads Stripe.
// Native builds resolve PremiumContext.native.tsx instead. No web purchase is simulated.
const PremiumContext = createContext<PremiumContextValue | null>(null);
const unavailable = async (): Promise<ActionResult> => ({ status: 'unavailable', message: 'Memberships are only available in a configured native app. All local features are free.' });
export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const showPaywall = useCallback(() => router.push('/paywall'), []);
  const noOp = useCallback(async () => undefined, []);
  const value = useMemo<PremiumContextValue>(() => ({ available: false, isPremium: false, isLoading: false, packages: [], offeringsLoading: false, error: null, offeringsError: null, customerInfo: null, purchasePackage: unavailable, restorePurchases: unavailable, refreshOfferings: noOp, showPaywall }), [noOp, showPaywall]);
  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}
export function usePremium() { const value = useContext(PremiumContext); if (!value) throw new Error('PremiumProvider is required.'); return value; }
