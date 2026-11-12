import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
export type ActionResult = { status: 'success' | 'cancelled' | 'unavailable' | 'error'; message: string };
export interface PremiumContextValue {
  available: boolean;
  isPremium: boolean;
  isLoading: boolean;
  packages: PurchasesPackage[];
  offeringsLoading: boolean;
  error: string | null;
  offeringsError: string | null;
  customerInfo: CustomerInfo | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<ActionResult>;
  restorePurchases: () => Promise<ActionResult>;
  refreshOfferings: () => Promise<void>;
  showPaywall: () => void;
}
