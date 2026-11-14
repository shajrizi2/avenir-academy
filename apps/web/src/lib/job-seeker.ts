'use client';

import type { JobSeekerMe, JobReportReason, PublicJob } from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export const jobSeekerKeys = {
  me: ['job-seeker', 'me'] as const,
  savedIds: ['job-seeker', 'saved-ids'] as const,
  saved: ['job-seeker', 'saved'] as const,
};

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

export function useSavedIds(enabled: boolean) {
  return useQuery({
    queryKey: jobSeekerKeys.savedIds,
    queryFn: () => jobsFetch<string[]>('/job-seekers/saved/ids'),
    enabled,
  });
}

export function useSavedJobs(enabled: boolean) {
  return useQuery({
    queryKey: jobSeekerKeys.saved,
    queryFn: () => jobsFetch<PublicJob[]>('/job-seekers/saved'),
    enabled,
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, save }: { jobId: string; save: boolean }) =>
      jobsFetch<void>(`/job-seekers/saved/${encodeURIComponent(jobId)}`, {
        method: save ? 'PUT' : 'DELETE',
      }),
    onMutate: async ({ jobId, save }) => {
      await queryClient.cancelQueries({ queryKey: jobSeekerKeys.savedIds });
      const before = queryClient.getQueryData<string[]>(jobSeekerKeys.savedIds);
      queryClient.setQueryData<string[]>(jobSeekerKeys.savedIds, (ids = []) =>
        save ? [...new Set([...ids, jobId])] : ids.filter((id) => id !== jobId),
      );
      return { before };
    },
    onError: (_error, _vars, context) =>
      queryClient.setQueryData(jobSeekerKeys.savedIds, context?.before),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: jobSeekerKeys.savedIds });
      void queryClient.invalidateQueries({ queryKey: jobSeekerKeys.saved });
    },
  });
}

export function useReportJob() {
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: JobReportReason }) =>
      jobsFetch(`/jobs/${encodeURIComponent(jobId)}/report`, { method: 'POST', body: { reason } }),
  });
}

/** Clears everything the browser knows about the job seeker (after sign-out or deletion). */
export function useForgetJobSeeker() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(jobSeekerKeys.me, null);
    queryClient.removeQueries({ queryKey: ['job-seeker', 'saved'] });
    queryClient.removeQueries({ queryKey: jobSeekerKeys.savedIds });
  };
}
