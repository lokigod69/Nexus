import type { SignalAnalysis } from '@/types';
import {
  getAllSettings,
  upsertSignalEnrichment,
} from '@/lib/db/queries';
import { ENRICHMENT_PLUGINS } from './plugins';
import { fetchFavicon } from './favicon';
import { fetchGitHubStats, isGitHubRepoUrl } from './github-stats';
import { fetchBookData } from './openlibrary';
import { storeEmoji } from './emoji';

export { ENRICHMENT_PLUGINS };

/**
 * Check if a plugin is enabled. Priority: settings table → env var → default.
 */
export async function isPluginEnabled(pluginId: string): Promise<boolean> {
  const plugin = ENRICHMENT_PLUGINS.find(p => p.id === pluginId);
  if (!plugin) return false;

  try {
    const allSettings = await getAllSettings();
    const settingKey = `enrichment.${pluginId}`;
    if (settingKey in allSettings) {
      return allSettings[settingKey] === 'true';
    }
  } catch {
    // Settings table might not exist yet
  }

  // Check env var
  const envKey = `ENRICHMENT_${pluginId.toUpperCase()}`;
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === 'true';
  }

  return plugin.enabled;
}

/**
 * Run all enabled signal-specific enrichments in parallel.
 * Called from the capture pipeline after embedding generation.
 * NEVER throws — all errors are caught and logged.
 */
export async function runSignalEnrichments(
  signalId: string,
  url: string,
  analysis: SignalAnalysis | null,
  _embedding: number[]
): Promise<void> {
  const enrichmentTasks: Promise<void>[] = [];

  // Favicon
  if (await isPluginEnabled('favicon')) {
    enrichmentTasks.push(
      (async () => {
        try {
          const favicon = await fetchFavicon(url);
          if (favicon) {
            await upsertSignalEnrichment(signalId, 'favicon', favicon);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`Enrichment favicon failed for ${signalId}:`, message);
        }
      })()
    );
  }

  // GitHub stats
  if (await isPluginEnabled('github_stats') && isGitHubRepoUrl(url)) {
    enrichmentTasks.push(
      (async () => {
        try {
          const stats = await fetchGitHubStats(url);
          if (stats) {
            await upsertSignalEnrichment(signalId, 'github_stats', stats);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`Enrichment github_stats failed for ${signalId}:`, message);
        }
      })()
    );
  }

  // Book references
  if (await isPluginEnabled('open_library') && analysis?.bookReferences?.length) {
    enrichmentTasks.push(
      (async () => {
        try {
          const bookRef = analysis.bookReferences![0];
          const bookData = await fetchBookData(bookRef.title, bookRef.author);
          if (bookData) {
            await upsertSignalEnrichment(signalId, 'book_ref', bookData);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`Enrichment book_ref failed for ${signalId}:`, message);
        }
      })()
    );
  }

  // Emoji
  if (await isPluginEnabled('emoji') && analysis?.suggestedEmoji) {
    enrichmentTasks.push(
      (async () => {
        try {
          await storeEmoji(signalId, analysis.suggestedEmoji!);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`Enrichment emoji failed for ${signalId}:`, message);
        }
      })()
    );
  }

  // Run all in parallel — never block, never throw
  await Promise.allSettled(enrichmentTasks);
}
