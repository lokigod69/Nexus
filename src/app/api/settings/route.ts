import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, setSetting } from '@/lib/db/queries';
import {
  getAvailableProviders,
  getAvailableModels,
  getAnalysisModelId,
  getChatModelId,
  getModelById,
} from '@/lib/ai/provider';

export async function GET() {
  try {
    const settings = await getAllSettings();

    const availableProviders = getAvailableProviders();
    const availableModels = getAvailableModels();
    const analysisModelId = await getAnalysisModelId();
    const chatModelId = await getChatModelId();
    const analysisModel = getModelById(analysisModelId);
    const chatModel = getModelById(chatModelId);

    return NextResponse.json({
      ...settings,
      _providers: {
        available: availableProviders,
      },
      _models: {
        available: availableModels,
        analysisModelId,
        chatModelId,
        analysisModel: analysisModel || null,
        chatModel: chatModel || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.key && body.value !== undefined) {
      await setSetting(body.key, String(body.value));
    } else if (body.settings && typeof body.settings === 'object') {
      for (const [key, value] of Object.entries(body.settings)) {
        await setSetting(key, String(value));
      }
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const settings = await getAllSettings();
    const availableProviders = getAvailableProviders();
    const availableModels = getAvailableModels();
    const analysisModelId = await getAnalysisModelId();
    const chatModelId = await getChatModelId();
    const analysisModel = getModelById(analysisModelId);
    const chatModel = getModelById(chatModelId);

    return NextResponse.json({
      ...settings,
      _providers: {
        available: availableProviders,
      },
      _models: {
        available: availableModels,
        analysisModelId,
        chatModelId,
        analysisModel: analysisModel || null,
        chatModel: chatModel || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
