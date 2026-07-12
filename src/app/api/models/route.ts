import { NextResponse } from 'next/server';
import { getSelectableModels } from '@/lib/ai/provider';
import type { ListModelsResponse } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/models — enrichment models with configured credentials, for a picker UI. */
export async function GET() {
  const response: ListModelsResponse = { models: getSelectableModels() };
  return NextResponse.json(response);
}
