import { NextRequest, NextResponse } from 'next/server';
import { getSignalById, updateSignal, deleteSignal } from '@/lib/db/queries';
import { exportSignalToObsidianWithRelated, deleteSignalFromObsidian } from '@/lib/export/obsidian-sync';

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

    // Re-export to Obsidian (fire-and-forget)
    if (process.env.OBSIDIAN_VAULT_PATH) {
      exportSignalToObsidianWithRelated(id).catch(err => {
        console.warn('[obsidian-sync] Re-export failed:', err instanceof Error ? err.message : err);
      });
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

    // Fetch signal data before deletion (needed for vault filename)
    const signal = await getSignalById(id);

    await deleteSignal(id);

    // Remove from Obsidian vault (fire-and-forget)
    if (process.env.OBSIDIAN_VAULT_PATH && signal) {
      deleteSignalFromObsidian(signal).catch(err => {
        console.warn('[obsidian-sync] Vault delete failed:', err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete signal' },
      { status: 500 }
    );
  }
}
