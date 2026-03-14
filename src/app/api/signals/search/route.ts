import { NextRequest, NextResponse } from 'next/server';
import { getAllSignalEmbeddings, getSignalById } from '@/lib/db/queries';
import { getEmbeddingProvider } from '@/lib/embedding/provider';
import { semanticSearch } from '@/lib/embedding/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    if (!q) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Embed the query
    const embeddingProvider = getEmbeddingProvider();
    const queryVector = await embeddingProvider.embedQuery(q);

    // Load all embeddings
    const allEmbeddings = await getAllSignalEmbeddings();

    // Semantic search
    const matches = semanticSearch(queryVector, allEmbeddings, limit);

    // Load full signals for results
    const results = await Promise.all(
      matches.map(async (match) => {
        const signal = await getSignalById(match.id);
        return { signal, score: match.score };
      })
    );

    return NextResponse.json({
      results: results.filter((r) => r.signal !== null),
    });
  } catch (error: any) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
