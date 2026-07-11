import { NextResponse } from 'next/server';
import { getPullItems } from '@/lib/db/queries';
import type { PullResponse } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/pull — everything routed and not yet delivered, with resolved
 *  project paths ('general' or unknown slug → null path). */
export async function GET() {
  try {
    const items = await getPullItems();
    const response: PullResponse = { items };
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/pull failed:', error);
    return NextResponse.json({ error: 'Failed to load pull queue' }, { status: 500 });
  }
}
