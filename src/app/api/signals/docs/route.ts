import { NextRequest, NextResponse } from 'next/server';
import {
  listSignalDocuments,
  generateSignalDocument,
  getDocumentedSignalIds,
} from '@/lib/export/signal-docs';
import { getSetting } from '@/lib/db/queries';
import type { AIProviderType } from '@/types';

// GET /api/signals/docs — list all docs + which signals have docs
export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get('mode');

    // Quick check mode — just return signal IDs that have docs
    if (mode === 'status') {
      const ids = await getDocumentedSignalIds();
      return NextResponse.json({ documentedIds: Array.from(ids) });
    }

    const docs = await listSignalDocuments();
    return NextResponse.json({ docs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list docs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/signals/docs — generate doc for a single signal
export async function POST(request: NextRequest) {
  try {
    const { signalId } = await request.json();

    if (!signalId) {
      return NextResponse.json({ error: 'signalId is required' }, { status: 400 });
    }

    // Use conductor model setting
    const conductorModel = await getSetting('conductor_model');
    let providerType: AIProviderType | undefined;
    if (conductorModel && conductorModel !== 'default') {
      providerType = conductorModel as AIProviderType;
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const doc = await generateSignalDocument(
            signalId,
            providerType,
            (stage) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ stage })}\n\n`)
              );
            },
          );

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, doc })}\n\n`)
          );
          controller.close();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Generation failed';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate doc';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
