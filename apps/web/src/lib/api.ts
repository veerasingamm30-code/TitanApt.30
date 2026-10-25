import type { ApiErrorBody } from '@titanapt/shared';

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error.message ?? 'The request could not be completed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error.code ?? 'NETWORK_ERROR';
    this.requestId = body?.error.requestId;
    this.details = body?.error.details;
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const entry of document.cookie.split(';')) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

export async function ensureCsrf(): Promise<string> {
  let token = readCookie('ta_csrf');
  if (!token) {
    const response = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (!response.ok) throw new ApiError(response.status, await safeJson(response));
    const body = (await response.json()) as { data: { csrfToken: string } };
    token = body.data.csrfToken;
  }
  return token;
}

async function safeJson(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  skipCsrf?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !options.skipCsrf) {
    headers.set('x-csrf-token', await ensureCsrf());
  }
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 401) window.dispatchEvent(new Event('titanapt:unauthorized'));
  if (!response.ok) throw new ApiError(response.status, await safeJson(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function apiData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<{ data: T }>(path, options).then((body) => body.data);
}

export function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function newIdempotencyKey(prefix: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100);
}
