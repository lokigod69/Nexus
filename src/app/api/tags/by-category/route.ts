import { NextRequest, NextResponse } from 'next/server';
import { getTagsForCategory } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    if (!category) {
      return NextResponse.json({ error: 'category param required' }, { status: 400 });
    }
    const tags = await getTagsForCategory(category);
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch category tags';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
