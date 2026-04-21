import { NextRequest, NextResponse } from 'next/server';
import {
  getAllConductorMemories,
  addConductorMemory,
  deleteConductorMemory,
  clearConductorMemories,
} from '@/lib/db/queries';

// GET — list all memories
export async function GET() {
  try {
    const memories = await getAllConductorMemories();
    return NextResponse.json({ memories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch memories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — add a memory
export async function POST(request: NextRequest) {
  try {
    const { fact, category, source } = await request.json();
    if (!fact || typeof fact !== 'string') {
      return NextResponse.json({ error: 'fact is required' }, { status: 400 });
    }
    const memory = await addConductorMemory(fact, category || 'general', source);
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add memory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — clear all memories or delete one by ID (query param)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await deleteConductorMemory(id);
    } else {
      await clearConductorMemories();
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete memory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
