import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { usePremium } from '@/contexts/PremiumContext';
import * as Haptics from 'expo-haptics';

const FEATURES = [
  {
    icon: 'flash' as const,
    title: 'All Stress Tests',
    description: 'CPU, Memory, Battery & Thermal stress testing',
  },
  {
    icon: 'analytics' as const,
    title: 'Advanced Graphs',
    description: 'Real-time temperature & historical data charts',
  },
  {
    icon: 'time' as const,
    title: 'Extended Tests',
    description: 'Longer test durations for thorough analysis',
  },
  {
    icon: 'document-text' as const,
    title: 'Export Reports',
    description: 'Exportable performance & stress test reports',
  },
  {
    icon: 'ban' as const,
    title: 'Ad-Free',
    description: 'Clean, distraction-free experience',
  },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { packages, purchasePackage, restorePurchases, isPremium } = usePremium();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handlePurchase = async () => {
    if (packages.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const success = await purchasePackage(packages[selectedIndex]);
    setPurchasing(false);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restorePurchases();
    if (isPremium) router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
        </Pressable>
        <Pressable
          onPress={handleRestore}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.restoreText}>Restore</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(255, 159, 10, 0.2)', 'rgba(255, 159, 10, 0)']}
            style={styles.heroBg}
          />
          <View style={styles.crownContainer}>
            <LinearGradient
              colors={[Colors.dark.secondary, '#E68A00']}
              style={styles.crownCircle}
            >
              <MaterialCommunityIcons name="crown" size={36} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>DevicePulse Pro</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the full power of device diagnostics
          </Text>
        </View>

        <View style={styles.featuresSection}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={20} color={Colors.dark.secondary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {packages.length > 0 ? (
          <View style={styles.packagesSection}>
            {packages.map((pkg, i) => {
              const isSelected = i === selectedIndex;
              const isPopular = i === 0;
              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedIndex(i);
                  }}
                  style={[
                    styles.packageCard,
                    isSelected && styles.packageSelected,
                  ]}
                >
                  {isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.packageContent}>
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageTitle}>
                        {pkg.packageType === 'ANNUAL' ? 'Annual' :
                         pkg.packageType === 'MONTHLY' ? 'Monthly' :
                         pkg.packageType === 'LIFETIME' ? 'Lifetime' :
                         pkg.product.title}
                      </Text>
                      <Text style={styles.packageDesc}>
                        {pkg.product.description || 'Full access to all premium features'}
                      </Text>
                    </View>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.noPackagesSection}>
            <View style={styles.setupCard}>
              <MaterialCommunityIcons name="information-outline" size={22} color={Colors.dark.primary} />
              <View style={styles.setupCardText}>
                <Text style={styles.setupTitle}>Payment Setup Required</Text>
                <Text style={styles.setupDesc}>
                  RevenueCat API keys need to be configured to enable in-app purchases. Add your keys in the project settings to activate subscriptions.
                </Text>
              </View>
            </View>
          </View>
        )}

        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || packages.length === 0}
          style={({ pressed }) => [
            styles.purchaseButton,
            (purchasing || packages.length === 0) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={[Colors.dark.secondary, '#E68A00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.purchaseGradient}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="crown" size={20} color="#FFF" />
                <Text style={styles.purchaseText}>
                  {packages.length > 0 ? 'Subscribe Now' : 'Not Available Yet'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={styles.legalText}>
          Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage your subscriptions in your device settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
    position: 'relative',
  },
  heroBg: {
    position: 'absolute',
    top: -40,
    left: -60,
    right: -60,
    height: 200,
    borderRadius: 100,
  },
  crownContainer: {
    marginBottom: 16,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  featuresSection: {
    gap: 2,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.secondaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  featureDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  packagesSection: {
    gap: 10,
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  packageSelected: {
    borderColor: Colors.dark.secondary,
    backgroundColor: Colors.dark.secondaryDim,
  },
  popularBadge: {
    backgroundColor: Colors.dark.secondary,
    paddingVertical: 4,
    alignItems: 'center',
  },
  popularText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dark.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.secondary,
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  packageDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  packagePrice: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  noPackagesSection: {
    marginBottom: 20,
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.dark.primaryDim,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  setupCardText: {
    flex: 1,
  },
  setupTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  setupDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  purchaseButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  purchaseText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  legalText: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 10,
  },
});
