import { NextResponse } from 'next/server';
import { buildPoetryCorpus, getPoetryCorpusStatus } from '@/lib/enrichment/poetry';

export async function GET() {
  try {
    const status = await getPoetryCorpusStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get poetry status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const count = await buildPoetryCorpus();
    return NextResponse.json({ success: true, count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to build poetry corpus';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
