import { router } from 'expo-router';
import { Button, Card, EmptyState, Page } from '@/components/ui';
export default function NotFoundScreen() {
  return <Page><Card><EmptyState icon="compass-outline" title="A little off the beaten path" description="That screen doesn’t exist. Let’s get you back to your device." action={<Button label="Back to overview" icon="arrow-back" onPress={() => router.replace('/')} />} /></Card></Page>;
}
