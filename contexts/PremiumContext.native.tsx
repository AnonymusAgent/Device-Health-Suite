import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { router } from 'expo-router';
import type { ActionResult, PremiumContextValue } from './premium-types';
export type { ActionResult } from './premium-types';

const ENTITLEMENT_ID = 'premium';

const PremiumContext = createContext<PremiumContextValue | null>(null);
const hasEntitlement = (info: CustomerInfo) => {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  return !!entitlement && entitlement.verification !== Purchases.VERIFICATION_RESULT.FAILED;
};
const unavailableResult: ActionResult = { status: 'unavailable', message: 'Memberships are only available in a configured native app. All local features are free.' };
export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const apiKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;
  const available = (Platform.OS === 'ios' || Platform.OS === 'android') && !!apiKey;
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(available);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(available);
  const [error, setError] = useState<string | null>(null);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const configured = useRef(false);
  const purchasing = useRef(false);
  const refreshOfferings = useCallback(async () => {
    if (!configured.current) return;
    setOfferingsLoading(true); setOfferingsError(null);
    try { const offerings = await Purchases.getOfferings(); setPackages(offerings.current?.availablePackages ?? []); }
    catch { setOfferingsError('Store options could not be loaded. Check your connection and try again.'); }
    finally { setOfferingsLoading(false); }
  }, []);
  useEffect(() => {
    if (!available || !apiKey) return;
    let mounted = true;
    const listener = (info: CustomerInfo) => { if (mounted) { setCustomerInfo(info); setIsPremium(hasEntitlement(info)); } };
    try {
      Purchases.configure({ apiKey, entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL, automaticDeviceIdentifierCollectionEnabled: false, diagnosticsEnabled: false });
      configured.current = true;
      Purchases.addCustomerInfoUpdateListener(listener);
      void Purchases.getCustomerInfo().then(info => { if (mounted) { setCustomerInfo(info); setIsPremium(hasEntitlement(info)); setError(null); } })
        .catch(() => { if (mounted) setError('Membership status could not be verified. Use Restore to try again.'); })
        .finally(() => { if (mounted) setIsLoading(false); });
      void refreshOfferings();
    } catch { setError('The store could not be initialized. Local features remain available.'); setIsLoading(false); setOfferingsLoading(false); }
    return () => { mounted = false; Purchases.removeCustomerInfoUpdateListener(listener); configured.current = false; };
  }, [available, apiKey, refreshOfferings]);
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<ActionResult> => {
    if (!configured.current) return unavailableResult;
    if (purchasing.current) return { status: 'error', message: 'A store transaction is already in progress.' };
    purchasing.current = true;
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info); const active = hasEntitlement(info); setIsPremium(active);
      return { status: active ? 'success' : 'error', message: active ? 'Your membership is active.' : 'The transaction finished, but no active membership was found. Restore purchases to check again.' };
    } catch (cause) {
      const error = cause as { userCancelled?: boolean; code?: string; message?: string };
      return error.userCancelled || error.code === '1' ? { status: 'cancelled', message: 'Purchase cancelled. You have not been charged by this action.' } : { status: 'error', message: error.message || 'The store could not complete this purchase. Please try again.' };
    } finally { purchasing.current = false; }
  }, []);
  const restorePurchases = useCallback(async (): Promise<ActionResult> => {
    if (!configured.current) return unavailableResult;
    if (purchasing.current) return { status: 'error', message: 'Wait for the current store transaction to finish.' };
    purchasing.current = true; setIsLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info); const active = hasEntitlement(info); setIsPremium(active); setError(null);
      return { status: 'success', message: active ? 'Your membership has been restored.' : 'No active membership was found for this store account.' };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not restore purchases. Check your connection and try again.';
      setError(message); return { status: 'error', message };
    } finally { purchasing.current = false; setIsLoading(false); }
  }, []);
  const showPaywall = useCallback(() => router.push('/paywall'), []);
  const value = useMemo(() => ({ available, isPremium, isLoading, packages, offeringsLoading, error, offeringsError, customerInfo, purchasePackage, restorePurchases, refreshOfferings, showPaywall }), [available, isPremium, isLoading, packages, offeringsLoading, error, offeringsError, customerInfo, purchasePackage, restorePurchases, refreshOfferings, showPaywall]);
  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}
export function usePremium() { const value = useContext(PremiumContext); if (!value) throw new Error('PremiumProvider is required.'); return value; }
