import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { router } from 'expo-router';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
const ENTITLEMENT_ID = 'premium';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  packages: PurchasesPackage[];
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  showPaywall: () => void;
  customerInfo: CustomerInfo | null;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [rcInitialized, setRcInitialized] = useState(false);

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

        if (!apiKey) {
          const cached = await AsyncStorage.getItem('premium_status');
          if (cached === 'true') setIsPremium(true);
          setIsLoading(false);
          return;
        }

        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        await Purchases.configure({ apiKey });
        setRcInitialized(true);

        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        const hasPremium = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
        setIsPremium(hasPremium);
        await AsyncStorage.setItem('premium_status', hasPremium ? 'true' : 'false');

        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current?.availablePackages) {
            setPackages(offerings.current.availablePackages);
          }
        } catch {}

        Purchases.addCustomerInfoUpdateListener((info) => {
          const hasPremium = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
          setIsPremium(hasPremium);
          setCustomerInfo(info);
          AsyncStorage.setItem('premium_status', hasPremium ? 'true' : 'false');
        });
      } catch {
        const cached = await AsyncStorage.getItem('premium_status');
        if (cached === 'true') setIsPremium(true);
      } finally {
        setIsLoading(false);
      }
    };

    initRevenueCat();
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      setIsPremium(hasPremium);
      setCustomerInfo(customerInfo);
      await AsyncStorage.setItem('premium_status', hasPremium ? 'true' : 'false');
      return hasPremium;
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', 'Something went wrong with the purchase. Please try again.');
      }
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const hasPremium = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      setIsPremium(hasPremium);
      await AsyncStorage.setItem('premium_status', hasPremium ? 'true' : 'false');
      if (hasPremium) {
        Alert.alert('Restored', 'Your premium subscription has been restored.');
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  }, []);

  const showPaywall = useCallback(() => {
    router.push('/paywall');
  }, []);

  const value = useMemo(() => ({
    isPremium,
    isLoading,
    packages,
    purchasePackage,
    restorePurchases,
    showPaywall,
    customerInfo,
  }), [isPremium, isLoading, packages, purchasePackage, restorePurchases, showPaywall, customerInfo]);

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
