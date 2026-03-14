import type { EnrichmentPlugin } from '@/types';

// ============================================================
// Plugin Registry — client-safe metadata only
// ============================================================

export const ENRICHMENT_PLUGINS: EnrichmentPlugin[] = [
  // Gamification
  { id: 'quotes', name: 'Loading Quotes', description: 'Rotating quotes during loading states', category: 'gamification', enabled: true, requiresApiKey: false },
  { id: 'http_animals', name: 'HTTP Cat/Dog Errors', description: 'Fun animal images for error states', category: 'gamification', enabled: true, requiresApiKey: false },
  { id: 'bored', name: 'Bored API', description: 'Activity suggestions for empty states', category: 'gamification', enabled: true, requiresApiKey: false },
  { id: 'memes', name: 'Meme Easter Eggs', description: '5% chance meme popup on triage discard', category: 'gamification', enabled: true, requiresApiKey: false },

  // Aesthetics
  { id: 'colormind', name: 'Daily Palette', description: 'Colormind daily color palette', category: 'aesthetics', enabled: true, requiresApiKey: false },
  { id: 'nasa_apod', name: 'NASA APOD', description: 'Daily space background image', category: 'aesthetics', enabled: true, requiresApiKey: false, apiKeyEnvVar: 'NASA_API_KEY' },
  { id: 'weather', name: 'Weather Effects', description: 'Weather-reactive visual overlays', category: 'aesthetics', enabled: false, requiresApiKey: false },

  // Data Enrichment
  { id: 'favicon', name: 'Site Favicons', description: 'Favicon icons on signal cards', category: 'data', enabled: true, requiresApiKey: false },
  { id: 'github_stats', name: 'GitHub Stats', description: 'Stars, forks, language for GitHub repos', category: 'data', enabled: true, requiresApiKey: false, apiKeyEnvVar: 'GITHUB_TOKEN' },
  { id: 'open_library', name: 'Book Detection', description: 'Book metadata from Open Library', category: 'data', enabled: true, requiresApiKey: false },
  { id: 'emoji', name: 'Contextual Emoji', description: 'AI-suggested emoji for signals', category: 'data', enabled: true, requiresApiKey: false },
  { id: 'dictionary', name: 'Dictionary Lookups', description: '/define command in chat panel', category: 'data', enabled: true, requiresApiKey: false },

  // Ambient
  { id: 'poetry', name: 'Poetry Matching', description: 'Semantically matched poems for signals', category: 'ambient', enabled: true, requiresApiKey: false },
  { id: 'facts', name: 'Random Facts', description: 'Floating fact shooting stars', category: 'ambient', enabled: false, requiresApiKey: false },

  // Utility
  { id: 'qr_code', name: 'QR Codes', description: 'QR code generation for signal URLs', category: 'utility', enabled: true, requiresApiKey: false },
  { id: 'rss', name: 'RSS Feeds', description: 'RSS feed subscriptions', category: 'utility', enabled: false, requiresApiKey: false },
];
