import { create } from 'zustand';
import type { QuoteData, APODData, WeatherState, PaletteData } from '@/types';

interface EnrichmentStore {
  settings: Record<string, string>;
  quotes: QuoteData[];
  palette: PaletteData | null;
  apod: APODData | null;
  weather: WeatherState | null;
  initialized: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  isEnabled: (pluginId: string) => boolean;
  loadQuotes: () => Promise<void>;
  loadPalette: () => Promise<void>;
  loadAPOD: () => Promise<void>;
  loadWeather: () => Promise<void>;
  initialize: () => Promise<void>;
}

// Default enabled states matching ENRICHMENT_PLUGINS
const PLUGIN_DEFAULTS: Record<string, boolean> = {
  quotes: true,
  http_animals: true,
  bored: true,
  memes: true,
  colormind: true,
  nasa_apod: true,
  weather: false,
  favicon: true,
  github_stats: true,
  open_library: true,
  emoji: true,
  dictionary: true,
  poetry: true,
  facts: false,
  qr_code: true,
  rss: false,
};

export const useEnrichmentStore = create<EnrichmentStore>((set, get) => ({
  settings: {},
  quotes: [],
  palette: null,
  apod: null,
  weather: null,
  initialized: false,

  loadSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        set({ settings: data });
      }
    } catch {
      // Settings not available yet
    }
  },

  updateSetting: async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      set(state => ({
        settings: { ...state.settings, [key]: value },
      }));
    } catch {
      // Silently fail
    }
  },

  isEnabled: (pluginId: string) => {
    const { settings } = get();
    const settingKey = `enrichment.${pluginId}`;
    if (settingKey in settings) {
      return settings[settingKey] === 'true';
    }
    return PLUGIN_DEFAULTS[pluginId] ?? false;
  },

  loadQuotes: async () => {
    try {
      const res = await fetch('/api/enrichment/quotes');
      if (res.ok) {
        const data = await res.json();
        set({ quotes: data.quotes || [] });
      }
    } catch {
      // Quotes not available
    }
  },

  loadPalette: async () => {
    try {
      const res = await fetch('/api/enrichment/palette');
      if (res.ok) {
        const data = await res.json();
        if (data.colors) {
          set({ palette: data });
        }
      }
    } catch {
      // Palette not available
    }
  },

  loadAPOD: async () => {
    try {
      const res = await fetch('/api/enrichment/apod');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          set({ apod: data });
        }
      }
    } catch {
      // APOD not available
    }
  },

  loadWeather: async () => {
    try {
      const res = await fetch('/api/enrichment/weather');
      if (res.ok) {
        const data = await res.json();
        if (data.condition) {
          set({ weather: data });
        }
      }
    } catch {
      // Weather not available
    }
  },

  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    const { loadSettings, loadQuotes, loadPalette, loadAPOD, loadWeather } = get();

    // Load settings first to know what's enabled
    await loadSettings();

    // Then load enabled global enrichments in parallel
    const tasks: Promise<void>[] = [];
    if (get().isEnabled('quotes')) tasks.push(loadQuotes());
    if (get().isEnabled('colormind')) tasks.push(loadPalette());
    if (get().isEnabled('nasa_apod')) tasks.push(loadAPOD());
    if (get().isEnabled('weather')) tasks.push(loadWeather());

    await Promise.allSettled(tasks);
  },
}));
