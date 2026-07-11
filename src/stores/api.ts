// Thin fetch client over the API contract in src/types/index.ts.
// Paths and shapes come from the contract; errors arrive as { error } + 4xx/5xx.
import type {
  CaptureStatus,
  CreateCaptureRequest,
  CreateCaptureResponse,
  EnrichResponse,
  ListCapturesResponse,
  ListProjectsResponse,
  UpdateCaptureRequest,
  UpdateCaptureResponse,
} from '@/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  /** POST /api/captures — instant create; enrichment is a separate call. */
  createCapture(content: string): Promise<CreateCaptureResponse> {
    const body: CreateCaptureRequest = { content };
    return request<CreateCaptureResponse>('/api/captures', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** POST /api/captures/[id]/enrich — idempotent; safe to re-fire on retry. */
  enrichCapture(id: string): Promise<EnrichResponse> {
    return request<EnrichResponse>(`/api/captures/${id}/enrich`, {
      method: 'POST',
    });
  },

  /** GET /api/captures?status=<status>&limit=<n> */
  listCaptures(status: CaptureStatus = 'inbox', limit = 50): Promise<ListCapturesResponse> {
    return request<ListCapturesResponse>(
      `/api/captures?status=${status}&limit=${limit}`,
    );
  },

  /** PATCH /api/captures/[id] — route ({project}) or archive ({status}). */
  updateCapture(id: string, patch: UpdateCaptureRequest): Promise<UpdateCaptureResponse> {
    return request<UpdateCaptureResponse>(`/api/captures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  /** GET /api/projects — registry for the routing picker. */
  listProjects(): Promise<ListProjectsResponse> {
    return request<ListProjectsResponse>('/api/projects');
  },
};
