import { NextRequest, NextResponse } from 'next/server';
import { getConductorDocument, type ConductorDocType } from '@/lib/export/conductor-docs';

// GET — read a specific document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'research') as ConductorDocType;

    const doc = await getConductorDocument(type, decodeURIComponent(filename));

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ doc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
