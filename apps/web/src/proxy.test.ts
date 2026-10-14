import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

function run(path: string, cookie?: string) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return proxy(request);
}

describe('proxy', () => {
  it('sends "/" to the Albanian landing page', () => {
    const res = run('/');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/sq');
  });

  it('redirects /en and /en/... permanently to /sq, keeping the rest of the URL', () => {
    expect(run('/en').status).toBe(301);
    expect(run('/en').headers.get('location')).toBe('http://localhost:3000/sq');
    const deep = run('/en/kurse?x=1');
    expect(deep.status).toBe(301);
    expect(deep.headers.get('location')).toBe('http://localhost:3000/sq/kurse?x=1');
  });

  it('sends signed-out visitors of the app to login with a return path', () => {
    const res = run('/checkout/abc?module=m1');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fcheckout%2Fabc%3Fmodule%3Dm1',
    );
    expect(run('/dashboard', 'aa_refresh=token').headers.get('location')).toBeNull();
  });
});
