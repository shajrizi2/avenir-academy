import type { EnrollmentSummary, Paginated, PublicUser, Role } from '@ai-academy/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from './api';

export const myEnrollmentsQuery = queryOptions({
  queryKey: ['me', 'enrollments'],
  queryFn: () => apiFetch<EnrollmentSummary[]>('/me/enrollments'),
});

export interface UsersQueryParams {
  page: number;
  pageSize: number;
  q?: string;
  role?: Role;
}

export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: ['users', params],
    queryFn: () => apiFetch<Paginated<PublicUser>>('/users', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });
