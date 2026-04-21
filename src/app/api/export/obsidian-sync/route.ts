import { NextRequest, NextResponse } from 'next/server';
import {
  exportAllSignals,
  exportSignalToObsidianWithRelated,
} from '@/lib/export/obsidian-sync';

export async function GET() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || null;
  return NextResponse.json({
    configured: !!vaultPath,
    vaultPath,
  });
}

export async function POST(request: NextRequest) {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) {
    return NextResponse.json(
      { error: 'OBSIDIAN_VAULT_PATH not configured in .env.local' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Single signal export
    if (body.signalId) {
      await exportSignalToObsidianWithRelated(body.signalId);
      return NextResponse.json({ exported: 1, errors: [] });
    }

    // Bulk export
    const result = await exportAllSignals();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Obsidian sync failed' },
      { status: 500 }
    );
  }
}
