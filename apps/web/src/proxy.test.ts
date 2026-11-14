import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, proxy, resetBoardStatus } from './proxy';

function run(path: string, cookie?: string) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return proxy(request);
}

function apiSays(body: unknown, ok = true) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));
}

afterEach(() => {
  vi.restoreAllMocks();
  resetBoardStatus();
});

describe('proxy', () => {
  it('sends "/" to the academy until the job board is switched on', async () => {
    apiSays({ public: false });
    const res = await run('/');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/training');
  });

  it('shows the job board at "/" once it is public, asking the API at most once a minute', async () => {
    const fetch = apiSays({ public: true });
    expect((await run('/')).headers.get('location')).toBeNull();
    expect((await run('/?kategoria=marketing')).headers.get('location')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('treats an unreachable API as "off", and lets the team preview the board', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    expect((await run('/')).headers.get('location')).toBe('http://localhost:3000/training');
    expect((await run('/?preview')).headers.get('location')).toBeNull();
  });

  it('sends signed-out visitors of the academy to its login with a return path', async () => {
    const res = await run('/training/checkout/abc?module=m1');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/training/login?next=%2Ftraining%2Fcheckout%2Fabc%3Fmodule%3Dm1',
    );
    expect(
      (await run('/training/dashboard', 'aa_refresh=token')).headers.get('location'),
    ).toBeNull();
  });

  it('only guards "/" and the signed-in area under /training', () => {
    expect(config.matcher.every((m) => m === '/' || m.startsWith('/training/'))).toBe(true);
  });
});
