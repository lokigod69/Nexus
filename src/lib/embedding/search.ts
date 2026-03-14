import { blobToVector } from './provider';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function semanticSearch(
  queryVector: number[],
  allSignals: { id: string; embedding: Buffer | null }[],
  topK: number = 10
): { id: string; score: number }[] {
  return allSignals
    .filter((s) => s.embedding)
    .map((s) => ({
      id: s.id,
      score: cosineSimilarity(queryVector, blobToVector(s.embedding!)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function findRelatedSignals(
  signalId: string,
  allSignals: { id: string; embedding: Buffer | null }[],
  topK: number = 5,
  minScore: number = 0.65
): { id: string; score: number }[] {
  const target = allSignals.find((s) => s.id === signalId);
  if (!target?.embedding) return [];

  const targetVector = blobToVector(target.embedding);

  return allSignals
    .filter((s) => s.id !== signalId && s.embedding)
    .map((s) => ({
      id: s.id,
      score: cosineSimilarity(targetVector, blobToVector(s.embedding!)),
    }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
