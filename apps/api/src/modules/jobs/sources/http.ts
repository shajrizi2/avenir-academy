/** The job sources' only way out to the internet, so tests can replace it. */
export interface JobsHttp {
  /** GET a JSON document. Throws on network errors and non-2xx answers. */
  json(url: string, headers?: Record<string, string>): Promise<unknown>;
  /** GET a page following redirects, for link checks. Never throws on 4xx/5xx. */
  page(url: string): Promise<{ status: number; finalUrl: string; body: string }>;
}

export const JOBS_HTTP = Symbol('JOBS_HTTP');

const USER_AGENT = 'AvenirJobs/1.0 (+https://avenir.academy; remote jobs for Kosovo)';
const TIMEOUT_MS = 20_000;
/** Link checks read at most this much of a page. */
const MAX_PAGE_BYTES = 300_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

async function readCapped(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_PAGE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** The real client: Node's fetch, a 20-second timeout and one retry on errors and 5xx/429. */
export class FetchJobsHttp implements JobsHttp {
  async json(url: string, headers: Record<string, string> = {}): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': USER_AGENT, accept: 'application/json', ...headers },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) {
          await res.body?.cancel();
          throw new HttpError(res.status, url);
        }
        return (await res.json()) as unknown;
      } catch (error) {
        const retryable =
          !(error instanceof HttpError) || error.status >= 500 || error.status === 429;
        if (attempt >= 1 || !retryable) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
  }

  async page(url: string): Promise<{ status: number; finalUrl: string; body: string }> {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: res.status, finalUrl: res.url || url, body: await readCapped(res) };
  }
}
