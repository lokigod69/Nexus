import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';
import { blobToVector } from '@/lib/embedding/provider';
import { cosineSimilarity } from '@/lib/embedding/search';

const EDGE_THRESHOLD = 0.70;

export async function GET() {
  try {
    const allSignals = await db
      .select({
        id: signals.id,
        embedding: signals.embedding,
        category: signals.category,
      })
      .from(signals)
      .where(isNotNull(signals.embedding))
      .all();

    const edges: Array<{ source: string; target: string; score: number }> = [];

    // Compute pairwise cosine similarity
    const vectors = allSignals.map((s: { id: string; embedding: unknown; category: string }) => ({
      id: s.id,
      vector: blobToVector(s.embedding as Buffer),
      category: s.category,
    }));

    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        const score = cosineSimilarity(vectors[i].vector, vectors[j].vector);
        if (score >= EDGE_THRESHOLD) {
          edges.push({
            source: vectors[i].id,
            target: vectors[j].id,
            score: Math.round(score * 1000) / 1000,
          });
        }
      }
    }

    return NextResponse.json({ edges });
  } catch (error: any) {
    console.error('Error computing edges:', error);
    return NextResponse.json({ error: 'Failed to compute edges' }, { status: 500 });
  }
}
