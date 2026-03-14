import { NextRequest, NextResponse } from 'next/server';
import { getSignalById, updateSignal, deleteSignal } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signal = await getSignalById(id);

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    return NextResponse.json(signal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signal' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle status-specific timestamp updates
    if (body.status === 'archived') {
      body.archivedAt = new Date().toISOString();
    } else if (body.status === 'starred' || body.status === 'active') {
      body.reviewedAt = new Date().toISOString();
    }

    const updated = await updateSignal(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update signal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSignal(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete signal' },
      { status: 500 }
    );
  }
}
