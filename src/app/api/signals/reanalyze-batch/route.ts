import { NextResponse } from 'next/server';
import { getAllSignals } from '@/lib/db/queries';

export async function GET() {
  try {
    const result = await getAllSignals({ category: 'other', limit: 500, offset: 0 });
    const ids = result.signals.map((s: { id: string }) => s.id);
    return NextResponse.json({ ids, count: ids.length });
  } catch (error: any) {
    console.error('Failed to fetch other-category signals:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}
