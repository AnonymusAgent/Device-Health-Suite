import React from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import { Button, EmptyState } from './ui';
/** Never mount protected content for a locked feature; an overlay is not an access boundary. */
export function PremiumGate({ children, feature = 'This feature' }: { children: React.ReactNode; feature?: string }) {
  const { isPremium, isLoading, available, showPaywall } = usePremium();
  if (isPremium) return <>{children}</>;
  return <EmptyState icon="lock-closed-outline" title={isLoading ? 'Checking membership' : feature} description={available ? 'An active membership is required. Your free local diagnostics remain available.' : 'Membership is not configured for this environment. No purchase is required for local diagnostics.'} action={available ? <Button label="View membership options" variant="secondary" onPress={showPaywall} /> : undefined} />;
}
