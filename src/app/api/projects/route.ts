import { NextRequest, NextResponse } from 'next/server';
import { listProjects, syncProjects } from '@/lib/db/queries';
import type { ListProjectsResponse, SyncProjectsResponse } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/projects — registry for the routing picker. */
export async function GET() {
  try {
    const projects = await listProjects();
    const response: ListProjectsResponse = { projects };
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/projects failed:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

/** PUT /api/projects — full-replace registry sync from the pull CLI. */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const list = body?.projects;
    if (!Array.isArray(list)) {
      return NextResponse.json({ error: 'projects must be an array' }, { status: 400 });
    }

    const cleaned: Array<{ slug: string; name: string; path: string; description: string }> = [];
    for (const p of list) {
      if (
        !p ||
        typeof p.slug !== 'string' ||
        !p.slug.trim() ||
        typeof p.name !== 'string' ||
        !p.name.trim() ||
        typeof p.path !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Each project needs slug, name, and path' },
          { status: 400 }
        );
      }
      cleaned.push({
        slug: p.slug.trim(),
        name: p.name.trim(),
        path: p.path,
        description: typeof p.description === 'string' ? p.description : '',
      });
    }

    const count = await syncProjects(cleaned);
    const response: SyncProjectsResponse = { count };
    return NextResponse.json(response);
  } catch (error) {
    console.error('PUT /api/projects failed:', error);
    return NextResponse.json({ error: 'Failed to sync projects' }, { status: 500 });
  }
}
