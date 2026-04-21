import { NextRequest, NextResponse } from 'next/server';
import { addTagToSignal, removeTagFromSignal } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tagName } = await request.json();
    if (!tagName || typeof tagName !== 'string' || tagName.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
    }
    const tag = await addTagToSignal(id, tagName.trim());
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to add tag';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tagId } = await request.json();
    if (!tagId || typeof tagId !== 'number') {
      return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
    }
    await removeTagFromSignal(id, tagId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to remove tag';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
