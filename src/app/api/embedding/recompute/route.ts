import { NextResponse } from 'next/server';
import {
  getAllSignalEmbeddingsWithCategory,
  updateSignalPositions,
} from '@/lib/db/queries';
import { computePositions } from '@/lib/embedding/umap';

export async function POST() {
  try {
    // Load all embeddings with category in a single query
    const allEmbeddings = await getAllSignalEmbeddingsWithCategory();

    const signalsWithCategory = allEmbeddings.map((e: { id: string | null; embedding: unknown; category: string | null }) => ({
      id: e.id!,
      embedding: e.embedding as Buffer,
      category: e.category || 'other',
    }));

    // Compute positions
    const positions = computePositions(signalsWithCategory);

    // Update positions in DB
    await updateSignalPositions(positions);

    // Convert Map to plain object for JSON response
    const positionsObj: Record<string, { x: number; y: number; z: number }> = {};
    for (const [id, pos] of positions) {
      positionsObj[id] = pos;
    }

    return NextResponse.json({
      positions: positionsObj,
      count: positions.size,
    });
  } catch (error: any) {
    console.error('Embedding recompute error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to recompute positions' },
      { status: 500 }
    );
  }
}
