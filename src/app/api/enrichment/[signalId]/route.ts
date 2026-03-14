import { NextRequest, NextResponse } from 'next/server';
import { getSignalEnrichments } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const { signalId } = await params;
    const enrichments = await getSignalEnrichments(signalId);
    return NextResponse.json(enrichments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch enrichments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
