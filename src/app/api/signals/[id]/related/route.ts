import { NextRequest, NextResponse } from 'next/server';
import { getAllSignalEmbeddings, getSignalById } from '@/lib/db/queries';
import { findRelatedSignals } from '@/lib/embedding/search';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Load all embeddings
    const allEmbeddings = await getAllSignalEmbeddings();

    // Find related signals
    const matches = findRelatedSignals(id, allEmbeddings, 5, 0.65);

    // Load full signals for results
    const related = await Promise.all(
      matches.map(async (match) => {
        const signal = await getSignalById(match.id);
        return { signal, score: match.score };
      })
    );

    return NextResponse.json({
      related: related.filter((r) => r.signal !== null),
    });
  } catch (error: any) {
    console.error('Related signals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find related signals' },
      { status: 500 }
    );
  }
}
