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

  it('notifies the central session handler once a request is unauthorized', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 401 }));
    const client = new HttpClient({ baseUrl: 'https://example.test', fetchImpl, onUnauthorized });

    await expect(client.get('/private')).rejects.toMatchObject({ kind: 'authentication', status: 401 } satisfies Partial<ApiError>);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
