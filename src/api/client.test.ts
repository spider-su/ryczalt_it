import { describe, expect, it, vi } from 'vitest';
import { ApiError, HttpClient } from './client';

describe('HttpClient authentication lifecycle', () => {
  it('reads the current token for each request', async () => {
    let token = 'first';
    const authorization: string[] = [];
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => { authorization.push(String((init?.headers as Record<string, string>).Authorization)); return new Response('{}', { status: 200 }); });
    const client = new HttpClient({ baseUrl: 'https://example.test', token: () => token, fetchImpl });

    await client.get('/one');
    token = 'second';
    await client.get('/two');

    expect(authorization).toEqual(['Bearer first', 'Bearer second']);
  });

  it('supports bodyless POST commands without a JSON body or content-type', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeUndefined();
      expect(init?.headers).toEqual({ Accept: 'application/json' });
      return new Response('{}', { status: 200 });
    });
    await new HttpClient({ baseUrl: 'https://example.test', fetchImpl }).postEmpty('/calculate');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('notifies the central session handler once a request is unauthorized', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 401 }));
    const client = new HttpClient({ baseUrl: 'https://example.test', fetchImpl, onUnauthorized });

    await expect(client.get('/private')).rejects.toMatchObject({ kind: 'authentication', status: 401 } satisfies Partial<ApiError>);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('keeps a valid session on 403 authorization failures', async () => {
    const onUnauthorized = vi.fn();
    const client = new HttpClient({ baseUrl: 'https://example.test', fetchImpl: async () => new Response('{}', { status: 403 }), onUnauthorized });
    await expect(client.get('/forbidden')).rejects.toMatchObject({ kind: 'authorization', status: 403 } satisfies Partial<ApiError>);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('preserves backend problem messages without invalidating a 403 session', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: 403, message: 'Profile access denied' }), { status: 403, headers: { 'content-type': 'application/json' } }));
    const client = new HttpClient({ baseUrl: 'https://example.test', fetchImpl, onUnauthorized });
    await expect(client.get('/forbidden')).rejects.toMatchObject({ kind: 'authorization', status: 403, message: 'Profile access denied' } satisfies Partial<ApiError>);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each([
    ['HTTP error', async () => new Response('{}', { status: 500 }), 'response'],
    ['network error', async () => { throw new Error('offline'); }, 'unavailable'],
    ['malformed JSON', async () => new Response('{', { status: 200 }), 'response']
  ] as const)('keeps %s distinct from an empty success', async (_label, fetchImpl, kind) => {
    const client = new HttpClient({ baseUrl: 'https://example.test', fetchImpl: fetchImpl as typeof fetch });
    await expect(client.get('/accounting')).rejects.toMatchObject({ kind });
  });

  it('reports an aborted request as a timeout', async () => {
    const fetchImpl = vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); });
    const client = new HttpClient({ baseUrl: 'https://example.test', fetchImpl });

    await expect(client.get('/accounting')).rejects.toMatchObject({ message: 'Investory API request timed out', kind: 'response' });
  });
});
