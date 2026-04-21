import { NextRequest, NextResponse } from 'next/server';
import {
  getSignalById,
  getConversation,
  createConversation,
  getMessages,
  addMessage,
} from '@/lib/db/queries';
import { getChatProvider, getModelById, getChatModelId } from '@/lib/ai/provider';
import { getChatSystemPrompt, getBrainDumpChatPrompt } from '@/lib/ai/prompts';
import type { Message } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getConversation(id);

    if (!conversation) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    const msgs = await getMessages(conversation.id!);
    return NextResponse.json({ conversation, messages: msgs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message, provider } = await request.json();

    // Load signal for context
    const signal = await getSignalById(id);
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Get or create conversation
    // 'provider' from client may be a model ID or legacy provider type
    let modelOverride: string | undefined;
    if (provider) {
      const model = getModelById(provider);
      if (model) modelOverride = provider;
    }
    const aiProvider = await getChatProvider(modelOverride);
    const activeModelId = modelOverride || await getChatModelId();
    const activeModel = getModelById(activeModelId);
    let conversation = await getConversation(id);
    if (!conversation) {
      conversation = await createConversation(
        id,
        activeModel?.provider || 'openrouter',
        activeModel?.modelId || 'unknown'
      );
    }

    // Save user message
    await addMessage(conversation.id!, 'user', message);

    // Load conversation history
    const history = await getMessages(conversation.id!);

    // Build system context
    const systemContext = signal.source === 'brain_dump'
      ? getBrainDumpChatPrompt(
          signal.rawScrapedContent || signal.summary || '',
          signal.category,
          signal.contentType,
          signal.note
        )
      : getChatSystemPrompt(
          signal.summary || signal.rawScrapedContent || '',
          signal.url || '',
          signal.category,
          signal.note
        );

    // Stream AI response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of aiProvider.chat(
            history as Message[],
            systemContext
          )) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Save assistant response after stream completes
          await addMessage(conversation.id!, 'assistant', fullResponse);
        } catch (err: any) {
          // Save partial response if we have any content
          if (fullResponse) {
            try {
              await addMessage(conversation.id!, 'assistant', fullResponse);
            } catch { /* best effort */ }
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process chat' },
      { status: 500 }
    );
  }
}
