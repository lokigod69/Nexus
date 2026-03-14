import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/provider';

export async function POST(request: NextRequest) {
  try {
    const { content, url } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const aiProvider = getAIProvider();
    const analysis = await aiProvider.summarize(content, url || '');

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
