import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCapture,
  getCapture,
  routeCapture,
  updateCapture,
  type CaptureUpdate,
} from '@/lib/db/queries';
import type { UpdateCaptureResponse } from '@/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** GET /api/captures/[id] — 404 for missing. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const capture = await getCapture(id);
    if (!capture) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 });
    }
    return NextResponse.json({ capture });
  } catch (error) {
    console.error('GET /api/captures/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to load capture' }, { status: 500 });
  }
}

/** PATCH /api/captures/[id] — route, archive, restore, or edit.
 *  Per UpdateCaptureRequest: projects (1+ slugs) → status 'routed' +
 *  routedAt now; empty projects array → 400; status 'archived'/'inbox'
 *  transitions; title/tags edits. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getCapture(id);
    if (!existing) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const patch: CaptureUpdate = {};

    let routeSlugs: string[] | undefined;
    if (body.projects !== undefined) {
      const raw: unknown = body.projects;
      if (
        !Array.isArray(raw) ||
        raw.some((p: unknown) => typeof p !== 'string' || !p.trim())
      ) {
        return NextResponse.json(
          { error: 'projects must be an array of non-empty slugs' },
          { status: 400 }
        );
      }
      const slugs = [...new Set((raw as string[]).map((p) => p.trim()))];
      if (slugs.length === 0) {
        return NextResponse.json(
          { error: 'projects must contain at least one slug' },
          { status: 400 }
        );
      }
      routeSlugs = slugs;
    }

    if (body.status !== undefined) {
      if (body.status !== 'inbox' && body.status !== 'archived') {
        return NextResponse.json(
          { error: "status must be 'inbox' or 'archived'" },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }

    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ error: 'title must be a string' }, { status: 400 });
      }
      patch.title = body.title;
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || body.tags.some((t: unknown) => typeof t !== 'string')) {
        return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 });
      }
      patch.tags = body.tags;
    }

    // Routing wins: sets projects + status 'routed' + routedAt.
    let capture;
    if (routeSlugs) {
      if (Object.keys(patch).length > 0) await updateCapture(id, patch);
      capture = await routeCapture(id, routeSlugs);
    } else {
      capture = await updateCapture(id, patch);
    }

    if (!capture) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 });
    }
    const response: UpdateCaptureResponse = { capture };
    return NextResponse.json(response);
  } catch (error) {
    console.error('PATCH /api/captures/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update capture' }, { status: 500 });
  }
}

/** DELETE /api/captures/[id] → { ok: true } */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = await deleteCapture(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/captures/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete capture' }, { status: 500 });
  }
}
