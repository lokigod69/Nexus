export function signalsToJson(signals: any[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: signals.length,
    signals: signals.map(s => ({
      ...s,
      embedding: undefined, // Don't export binary blobs
      rawScrapedContent: undefined, // Too large
      tags: s.tags?.map((t: any) => t.name || t) || [],
    })),
  }, null, 2);
}
