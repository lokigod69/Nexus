import { NextRequest, NextResponse } from 'next/server';
import {
  getConductorConversation,
  getConductorMessages,
  deleteConductorConversation,
} from '@/lib/db/queries';

// GET — load full conversation with messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getConductorConversation(id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await getConductorMessages(id);

    return NextResponse.json({ conversation, messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete a conversation
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteConductorConversation(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
