// ============================================================
// Nexus — Shared Type Definitions
// ============================================================

// --- Union Types ---

export type Category =
  | 'prompts'
  | 'coding'
  | 'ai-art'
  | 'video'
  | 'tools'
  | 'philosophy'
  | 'music'
  | 'lifestyle'
  | 'learning'
  | 'other';

export type ContentType =
  | 'tutorial'
  | 'prompt'
  | 'discussion'
  | 'tool'
  | 'showcase'
  | 'thread'
  | 'article'
  | 'video'
  | 'resource';

export type ExtractedContentType =
  | 'prompt'
  | 'code'
  | 'technique'
  | 'quote'
  | 'none';

export type SignalStatus =
  | 'inbox'
  | 'triaged'
  | 'active'
  | 'playground'
  | 'starred'
  | 'archived';

export type AIProviderType = 'anthropic' | 'openai';

export type ViewMode = 'universe' | 'grid' | 'timeline' | 'triage';

export type SignalSource =
  | 'X/Twitter'
  | 'GitHub'
  | 'YouTube'
  | 'Reddit'
  | 'Medium'
  | 'Web';

// --- Core Entities ---

export interface Signal {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  keyTakeaway: string | null;
  extractedContent: string | null;
  extractedContentType: ExtractedContentType | null;
  rawScrapedContent: string | null;
  category: Category;
  contentType: ContentType;
  source: SignalSource;
  status: SignalStatus;
  actionable: boolean;
  note: string | null;
  aiProvider: AIProviderType | null;
  // Embedding fields
  embedding: Buffer | null;
  embeddingModel: string | null;
  embeddingDim: number | null;
  posX: number | null;
  posY: number | null;
  posZ: number | null;
  // Timestamps
  scrapedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  archivedAt: string | null;
  // Joined data (optional, populated by queries)
  tags?: Tag[];
  // Enrichment data (optional, populated by getSignalById)
  enrichments?: Record<string, unknown>;
}

export interface Tag {
  id: number;
  name: string;
  createdAt: string;
}

export interface SignalTag {
  signalId: string;
  tagId: number;
}

export interface Conversation {
  id: string;
  signalId: string;
  title: string | null;
  aiProvider: AIProviderType;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: string;
}

export interface SignalCollection {
  signalId: string;
  collectionId: string;
}

export interface Settings {
  key: string;
  value: string;
}

// --- API Types ---

export interface SignalAnalysis {
  title: string;
  summary: string;
  keyTakeaway: string;
  category: Category;
  contentType: ContentType;
  tags: string[];
  extractedContent: string | null;
  extractedContentType: ExtractedContentType;
  actionable: boolean;
  bookReferences?: { title: string; author: string }[];
  suggestedEmoji?: string;
}

export interface ScrapedContent {
  title: string;
  content: string;
  description: string | null;
  url: string;
  siteName: string | null;
  ogImage?: string | null;
}

export interface SignalFilters {
  status?: string;
  category?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'starred';
  limit?: number;
  offset?: number;
}

// --- AI Provider Interface ---

export interface AIProvider {
  summarize(content: string, url: string): Promise<SignalAnalysis>;
  chat(
    messages: Message[],
    systemContext: string
  ): AsyncGenerator<string, void, unknown>;
  getModelName(tier: 'fast' | 'deep'): string;
}

// --- Embedding Provider Interface ---

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  getModelName(): string;
  getDimension(): number;
}

// --- Store Types ---

export interface SignalStore {
  signals: Signal[];
  selectedSignalId: string | null;
  filters: SignalFilters;
  loading: boolean;
  capturing: boolean;
  captureProgress: 'idle' | 'scraping' | 'analyzing' | 'embedding' | 'captured' | 'error';
  error: string | null;
  fetchSignals: () => Promise<void>;
  captureSignal: (url: string, note?: string, category?: string) => Promise<void>;
  bulkCapture: (urls: string[], skipAnalysis?: boolean) => Promise<void>;
  updateSignal: (id: string, data: Partial<Signal>) => Promise<void>;
  deleteSignal: (id: string) => Promise<void>;
  selectSignal: (id: string | null) => void;
  setFilters: (filters: Partial<SignalFilters>) => void;
}

export interface UIStore {
  viewMode: ViewMode;
  detailPanelOpen: boolean;
  sidebarOpen: boolean;
  captureModalOpen: boolean;
  commandPaletteOpen: boolean;
  settingsPanelOpen: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleDetailPanel: (open?: boolean) => void;
  toggleSidebar: () => void;
  toggleCaptureModal: (open?: boolean) => void;
  toggleCommandPalette: (open?: boolean) => void;
  toggleSettingsPanel: (open?: boolean) => void;
}

// --- Category Definition ---

export interface CategoryDefinition {
  id: Category;
  label: string;
  icon: string;
  color: string;
}

// ============================================================
// Enrichment Types
// ============================================================

export type EnrichmentCategory = 'gamification' | 'aesthetics' | 'data' | 'ambient' | 'utility';

export interface EnrichmentPlugin {
  id: string;
  name: string;
  description: string;
  category: EnrichmentCategory;
  enabled: boolean;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
}

export interface FaviconData {
  url: string;
  source: string;
}

export interface GitHubStatsData {
  stars: number;
  forks: number;
  language: string | null;
  lastCommit: string;
  description: string | null;
  isOutdated: boolean;
  openIssues: number;
}

export interface BookRefData {
  title: string;
  author: string | null;
  firstPublishYear: number | null;
  coverId: number | null;
  coverUrl: string | null;
  openLibraryKey: string | null;
  subjects: string[] | null;
}

export interface PoemMatchData {
  title: string;
  author: string;
  lines: string[];
  similarity: number;
}

export interface QuoteData {
  text: string;
  author: string;
  source: string;
}

export interface APODData {
  url: string;
  hdurl: string | null;
  title: string;
  explanation: string;
  mediaType: string;
}

export interface WeatherState {
  condition: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'fog' | 'other';
  temp: number;
  icon: string;
  description: string;
}

export interface PaletteData {
  colors: string[];
}

export interface DictionaryResult {
  word: string;
  phonetic: string | null;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

export interface SignalEnrichment {
  id: string;
  signalId: string;
  enrichmentType: string;
  data: string;
  fetchedAt: string | null;
  expiresAt: string | null;
}

export interface EnrichmentCacheEntry {
  key: string;
  data: string;
  fetchedAt: string | null;
  expiresAt: string;
}
