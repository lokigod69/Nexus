import { upsertSignalEnrichment } from '@/lib/db/queries';

/**
 * Store the AI-suggested emoji for a signal.
 */
export async function storeEmoji(signalId: string, emoji: string): Promise<void> {
  await upsertSignalEnrichment(signalId, 'emoji', { emoji });
}
