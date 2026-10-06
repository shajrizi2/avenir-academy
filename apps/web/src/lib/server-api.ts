import 'server-only';
import { parseResponse } from './api';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1';

/**
 * Anonymous GET against the API from server components (public catalog data).
 * Uncached: with cacheComponents, call it from a component inside <Suspense>.
 */
export async function serverGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_INTERNAL_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  return parseResponse<T>(res);
}
