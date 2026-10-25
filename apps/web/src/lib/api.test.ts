import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiData, ensureCsrf, messageFromError, newIdempotencyKey } from './api.js';

function clearCsrfCookie() {
  document.cookie = 'ta_csrf=; Max-Age=0; path=/';
}

describe('API client', () => {
  beforeEach(() => {
    clearCsrfCookie();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearCsrfCookie();
  });

  it('uses the CSRF cookie when one is available', async () => {
    document.cookie = 'ta_csrf=cookie-token; path=/';
    expect(await ensureCsrf()).toBe('cookie-token');
  });

  it('bootstraps CSRF when the cookie is missing', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { csrfToken: 'new-token' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    expect(await ensureCsrf()).toBe('new-token');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/csrf', { credentials: 'include' });
  });

  it('adds JSON and CSRF headers to unsafe requests', async () => {
    document.cookie = 'ta_csrf=header-token; path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiData<{ ok: boolean }>('/api/example', {
      method: 'POST',
      body: { value: 1 },
    });

    expect(result).toEqual({ ok: true });
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('x-csrf-token')).toBe('header-token');
    expect(options?.body).toBe(JSON.stringify({ value: 1 }));
    expect(options?.credentials).toBe('include');
  });

  it('turns API failures into structured errors and emits unauthorized events', async () => {
    const listener = vi.fn();
    window.addEventListener('titanapt:unauthorized', listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Please sign in.',
            requestId: 'request-1',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const error = await apiData('/api/private').catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Please sign in.',
      requestId: 'request-1',
    });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('titanapt:unauthorized', listener);
  });

  it('prefers API messages and falls back safely', () => {
    expect(messageFromError(new ApiError(500, null))).toBe('The request could not be completed.');
    expect(messageFromError(new Error('Plain failure'))).toBe('Plain failure');
    expect(messageFromError('unknown')).toBe('Something went wrong. Please try again.');
  });

  it('creates sanitized, bounded idempotency keys', () => {
    const key = newIdempotencyKey('practice answer');
    expect(key).toMatch(/^practice-answer-[A-Za-z0-9_-]+$/);
    expect(key.length).toBeLessThanOrEqual(100);
  });
});
