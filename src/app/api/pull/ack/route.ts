import { NextRequest, NextResponse } from 'next/server';
import { ackCaptures } from '@/lib/db/queries';
import type { AckResponse } from '@/types';

export const dynamic = 'force-dynamic';

/** POST /api/pull/ack — mark written captures delivered. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.some((id: unknown) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'ids must be an array of strings' }, { status: 400 });
    }

    const acked = await ackCaptures(ids);
    const response: AckResponse = { acked };
    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/pull/ack failed:', error);
    return NextResponse.json({ error: 'Failed to ack captures' }, { status: 500 });
  }
}
