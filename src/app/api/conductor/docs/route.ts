import { NextRequest, NextResponse } from 'next/server';
import {
  listConductorDocuments,
  saveConductorDocument,
  deleteConductorDocument,
  type ConductorDocType,
} from '@/lib/export/conductor-docs';

// GET — list all conductor documents
export async function GET() {
  try {
    const docs = await listConductorDocuments();
    return NextResponse.json({ docs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create a new document
export async function POST(request: NextRequest) {
  try {
    const { title, content, type, conversationId } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const validTypes: ConductorDocType[] = ['research', 'draft', 'notes'];
    const docType = validTypes.includes(type) ? type : 'research';

    const doc = await saveConductorDocument(title, content, docType, conversationId);
    return NextResponse.json({ doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete a document by type + filename
export async function DELETE(request: NextRequest) {
  try {
    const { type, filename } = await request.json();
    if (!type || !filename) {
      return NextResponse.json({ error: 'type and filename are required' }, { status: 400 });
    }

    const success = await deleteConductorDocument(type, filename);
    if (!success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
