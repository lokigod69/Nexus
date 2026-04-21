import { NextRequest, NextResponse } from 'next/server';
import {
  getSignalDocument,
  deleteSignalDocument,
} from '@/lib/export/signal-docs';

// GET /api/signals/docs/:signalId — read a doc
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ signalId: string }> },
) {
  try {
    const { signalId } = await params;
    const doc = await getSignalDocument(signalId);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ doc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read doc';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/signals/docs/:signalId — delete a doc
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ signalId: string }> },
) {
  try {
    const { signalId } = await params;
    const deleted = await deleteSignalDocument(signalId);

    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete doc';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
