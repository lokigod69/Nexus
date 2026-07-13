// Thin fetch client over the API contract in src/types/index.ts.
// Paths and shapes come from the contract; errors arrive as { error } + 4xx/5xx.
import type {
  AskRequest,
  AskResponse,
  CaptureStatus,
  CreateCaptureRequest,
  CreateCaptureResponse,
  EnrichRequest,
  EnrichResponse,
  ListCapturesResponse,
  ListModelsResponse,
  ListProjectsResponse,
  UpdateCaptureRequest,
  UpdateCaptureResponse,
} from '@/types';

/** Error carrying the HTTP status, so callers can special-case (e.g. 502 on ask). */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    // The auth cookie lapsed or never landed — bounce to the login gate
    // instead of surfacing a raw "Unauthorized" toast the user can't act on.
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/';
      throw new ApiError('Redirecting to login', 401);
    }
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  /** POST /api/captures — instant create; enrichment is a separate call.
   *  `skipEnrich` saves raw (no AI): the capture starts enrichStatus 'skipped'. */
  createCapture(content: string, skipEnrich = false): Promise<CreateCaptureResponse> {
    const body: CreateCaptureRequest = skipEnrich ? { content, skipEnrich } : { content };
    return request<CreateCaptureResponse>('/api/captures', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** POST /api/captures/[id]/enrich — idempotent; safe to re-fire on retry.
   *  `modelId` forces one specific model for this call only (A/B testing). */
  enrichCapture(id: string, modelId?: string): Promise<EnrichResponse> {
    const body: EnrichRequest = modelId ? { modelId } : {};
    return request<EnrichResponse>(`/api/captures/${id}/enrich`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** GET /api/models — selectable enrichment models for a picker UI. */
  listModels(): Promise<ListModelsResponse> {
    return request<ListModelsResponse>('/api/models');
  },

  /** GET /api/captures?status=<status|all>&q=<text>&limit=<n> */
  listCaptures(
    status: CaptureStatus | 'all' = 'inbox',
    limit = 50,
    q?: string,
  ): Promise<ListCapturesResponse> {
    const params = new URLSearchParams({ status, limit: String(limit) });
    if (q && q.trim()) params.set('q', q.trim());
    return request<ListCapturesResponse>(`/api/captures?${params.toString()}`);
  },

  /** PATCH /api/captures/[id] — route ({projects}), archive, or restore ({status}). */
  updateCapture(id: string, patch: UpdateCaptureRequest): Promise<UpdateCaptureResponse> {
    return request<UpdateCaptureResponse>(`/api/captures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  /** DELETE /api/captures/[id] — removes Nexus's record only. */
  deleteCapture(id: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/captures/${id}`, { method: 'DELETE' });
  },

  /** POST /api/ask — one-shot question over the full capture history. */
  ask(question: string): Promise<AskResponse> {
    const body: AskRequest = { question };
    return request<AskResponse>('/api/ask', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** GET /api/projects — registry for the routing picker. */
  listProjects(): Promise<ListProjectsResponse> {
    return request<ListProjectsResponse>('/api/projects');
  },
};
