import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpError, type JobsHttp } from './http.js';

const FIXTURES = join(import.meta.dirname, '../../../../test/fixtures/jobs');

/** Answers job-source requests from saved sample responses (tests only). */
export class FakeJobsHttp implements JobsHttp {
  readonly requested: string[] = [];
  /** URL prefix → fixture file name, JSON value, or an HTTP status to fail with. */
  constructor(
    private readonly routes: Record<string, string | number | unknown[] | Record<string, unknown>>,
    private readonly pages: Record<
      string,
      { status: number; finalUrl?: string; body?: string }
    > = {},
  ) {}

  static fixture(name: string): unknown {
    return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as unknown;
  }

  json(url: string): Promise<unknown> {
    this.requested.push(url);
    const key = Object.keys(this.routes)
      .filter((prefix) => url.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (key === undefined) return Promise.reject(new HttpError(404, url));
    const route = this.routes[key];
    if (typeof route === 'number') return Promise.reject(new HttpError(route, url));
    return Promise.resolve(typeof route === 'string' ? FakeJobsHttp.fixture(route) : route);
  }

  page(url: string): Promise<{ status: number; finalUrl: string; body: string }> {
    this.requested.push(url);
    const page = this.pages[url] ?? { status: 200 };
    return Promise.resolve({
      status: page.status,
      finalUrl: page.finalUrl ?? url,
      body: page.body ?? '',
    });
  }
}
