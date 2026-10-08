import type { ApiErrorBody, AuthResponse } from '@ai-academy/shared';

/** Browser requests go through the Next.js rewrite (same origin, see next.config.ts). */
export const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages[0] ?? `Request failed (${status})`);
    this.name = 'ApiError';
  }
}

// ---- In-memory access token (never persisted; the refresh token is an httpOnly cookie) ----

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse | null> | null = null;
const sessionListeners = new Set<(session: AuthResponse | null) => void>();

export function setSession(session: AuthResponse | null): void {
  accessToken = session?.accessToken ?? null;
  sessionListeners.forEach((listener) => listener(session));
}

export function onSessionChange(listener: (session: AuthResponse | null) => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/** Exchanges the refresh cookie for a new session. Concurrent callers share one request. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'same-origin',
  })
    .then(async (res) => (res.ok ? ((await res.json()) as AuthResponse) : null))
    .catch(() => null)
    .then((session) => {
      setSession(session);
      return session;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Query string parameters; undefined/empty values are skipped. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * JSON fetch against the API. Sends the access token when we have one, and on a 401
 * refreshes the session once and retries.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, query, headers, ...init } = options;
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }

  const send = () =>
    fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send();
  if (res.status === 401 && accessToken && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await send();
  }
  return parseResponse<T>(res);
}

/** Multipart upload (e.g. a material file) with the same auth and retry as apiFetch. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const send = () =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: form,
    });
  let res = await send();
  if (res.status === 401 && accessToken && (await refreshSession())) res = await send();
  return parseResponse<T>(res);
}

/**
 * Downloads an authenticated file and hands it to the browser as a normal download. Plain
 * links can't carry the in-memory access token.
 */
export async function apiDownload(path: string, fallbackName: string): Promise<void> {
  const send = () =>
    fetch(`${API_BASE}${path}`, {
      credentials: 'same-origin',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  let res = await send();
  if (res.status === 401 && accessToken && (await refreshSession())) res = await send();
  if (!res.ok) return parseResponse<void>(res);

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/i.exec(disposition)?.[1];
  const name = encoded ? decodeURIComponent(encoded) : (plain ?? fallbackName);

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as ApiErrorBody | null)?.message;
    const messages = Array.isArray(message) ? message : message ? [message] : [];
    throw new ApiError(res.status, messages.length ? messages : [defaultMessage(res.status)]);
  }
  return data as T;
}

function defaultMessage(status: number): string {
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return `Request failed (${status})`;
}

/** Human-readable error text for toasts and form alerts. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.messages.join('. ');
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
