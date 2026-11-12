import { z } from 'zod';
export const preferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  sampleIntervalMs: z.union([z.literal(1000), z.literal(2000), z.literal(5000)]).default(2000),
  autoSave: z.boolean().default(true),
  reduceMotion: z.boolean().default(false),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', sampleIntervalMs: 2000, autoSave: true, reduceMotion: false };
export function parsePreferences(raw: string | null): Preferences {
  return raw ? preferencesSchema.parse(JSON.parse(raw)) : { ...DEFAULT_PREFERENCES };
}
