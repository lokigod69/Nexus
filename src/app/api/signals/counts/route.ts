import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const categoryRows = await db
      .select({
        category: signals.category,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(signals)
      .groupBy(signals.category)
      .all();

    const statusRows = await db
      .select({
        status: signals.status,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(signals)
      .groupBy(signals.status)
      .all();

    const categories: Record<string, number> = {};
    for (const row of categoryRows) {
      categories[row.category] = row.count;
    }

    const statuses: Record<string, number> = {};
    for (const row of statusRows) {
      statuses[row.status] = row.count;
    }

    return NextResponse.json({ categories, statuses });
  } catch (error: any) {
    console.error('[counts]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch counts' },
      { status: 500 }
    );
  }
}
