import { NextResponse } from 'next/server';
import {
  generateSignalDocument,
  getDocumentedSignalIds,
} from '@/lib/export/signal-docs';
import { getAllSignals, getSetting } from '@/lib/db/queries';
import type { AIProviderType } from '@/types';

// POST /api/signals/docs/batch — generate docs for all un-documented signals
export async function POST(request: Request) {
  try {
    const abortSignal = request.signal;
    
    // Get all signal IDs
    const { signals } = await getAllSignals({ limit: 10000, sort: 'newest' });
    const documented = await getDocumentedSignalIds();

    // Filter to only undocumented signals
    const pending = signals.filter((s: { id: string }) => !documented.has(s.id));

    if (pending.length === 0) {
      return NextResponse.json({ message: 'All signals already documented', total: 0 });
    }

    // Determine provider
    const conductorModel = await getSetting('conductor_model');
    let providerType: AIProviderType | undefined;
    if (conductorModel && conductorModel !== 'default') {
      providerType = conductorModel as AIProviderType;
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const total = pending.length;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', total })}\n\n`)
        );

        for (let i = 0; i < total; i++) {
          if (abortSignal.aborted) {
            console.log('[signal-docs-batch] Aborted by client');
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Aborted by user' })}\n\n`)
            );
            break;
          }
          
          const signal = pending[i];
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                signalId: signal.id,
                title: signal.title,
                stage: 'starting',
              })}\n\n`)
            );

            const doc = await generateSignalDocument(
              signal.id,
              providerType,
              (stage) => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'progress',
                    current: i + 1,
                    total,
                    signalId: signal.id,
                    title: signal.title,
                    stage,
                  })}\n\n`)
                );
              },
            );

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'completed',
                current: i + 1,
                total,
                signalId: signal.id,
                title: signal.title,
                wordCount: doc.wordCount,
              })}\n\n`)
            );
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Failed';
            console.error(`[signal-docs-batch] FAILED ${signal.id} "${signal.title}":`, err);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                current: i + 1,
                total,
                signalId: signal.id,
                title: signal.title,
                error: errMsg,
              })}\n\n`)
            );
            // Continue with next signal
          }
          
          // Cooldown between requests to prevent hitting API rate limits
          if (i < total - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', total })}\n\n`)
        );
        controller.close();
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
    const message = error instanceof Error ? error.message : 'Batch generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
