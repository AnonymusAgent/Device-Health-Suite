import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { usePremium } from '@/contexts/PremiumContext';
import * as Haptics from 'expo-haptics';

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function PremiumGate({ children, feature = 'This feature' }: PremiumGateProps) {
  const { isPremium, togglePremium } = usePremium();

  if (isPremium) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.blurred}>{children}</View>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(10, 14, 26, 0.7)', 'rgba(10, 14, 26, 0.95)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.lockIcon}>
            <MaterialCommunityIcons name="crown" size={28} color={Colors.dark.secondary} />
          </View>
          <Text style={styles.title}>Premium Feature</Text>
          <Text style={styles.description}>
            {feature} requires a premium subscription for full access.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              togglePremium();
            }}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={[Colors.dark.secondary, '#E68A00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <MaterialCommunityIcons name="crown" size={16} color="#FFF" />
              <Text style={styles.buttonText}>Unlock Premium</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blurred: {
    flex: 1,
    opacity: 0.2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.secondaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  description: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
