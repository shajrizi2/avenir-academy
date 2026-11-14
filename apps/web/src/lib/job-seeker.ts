'use client';

import type { JobSeekerMe } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, ApiError, parseResponse } from './api';

/** Job-board calls: the session is an httpOnly cookie on the API host (PLAN D36), no token. */
export async function jobsFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return parseResponse<T>(res);
}

export const jobSeekerKeys = { me: ['job-seeker', 'me'] as const };

/** The signed-in job seeker, or null. */
export function useJobSeeker() {
  return useQuery({
    queryKey: jobSeekerKeys.me,
    queryFn: async (): Promise<JobSeekerMe | null> => {
      try {
        return await jobsFetch<JobSeekerMe>('/job-seekers/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}
