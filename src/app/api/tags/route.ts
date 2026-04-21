import { NextRequest, NextResponse } from 'next/server';
import { getAllTags, addTagToSignal } from '@/lib/db/queries';

export async function GET() {
  try {
    const tags = await getAllTags();
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tags';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
    }
    // addTagToSignal requires a signalId, but for standalone tag creation
    // we just need to ensure the tag exists in the tags table.
    // Use the db directly with a clean import.
    const { db } = await import('@/lib/db/index');
    const { tags } = await import('@/lib/db/schema');
    const { sql, eq } = await import('drizzle-orm');

    const trimmed = name.trim();
    db.run(sql`INSERT OR IGNORE INTO tags (name) VALUES (${trimmed})`);
    const tag = db.select().from(tags).where(eq(tags.name, trimmed)).get();

    return NextResponse.json({ tag });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create tag';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
