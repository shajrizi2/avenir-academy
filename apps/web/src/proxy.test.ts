import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

function run(path: string, cookie?: string) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return proxy(request);
}

describe('proxy', () => {
  it('sends signed-out visitors of the academy to its login with a return path', () => {
    const res = run('/training/checkout/abc?module=m1');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/training/login?next=%2Ftraining%2Fcheckout%2Fabc%3Fmodule%3Dm1',
    );
  });

  it('lets signed-in visitors through', () => {
    expect(run('/training/dashboard', 'aa_refresh=token').headers.get('location')).toBeNull();
  });

  it('only guards the signed-in area under /training', () => {
    expect(config.matcher.every((m) => m.startsWith('/training/'))).toBe(true);
  });
});
