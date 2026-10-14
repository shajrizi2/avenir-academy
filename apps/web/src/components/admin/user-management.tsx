'use client';

import { ROLES, type Role } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { fmt, t } from '@/i18n/messages';
import { usersQuery } from '@/lib/queries';
import { UsersTable } from './users-table';

const PAGE_SIZE = 20;
const ALL = 'ALL';

/** Search, role filter and pagination live in the URL so views can be shared and reloaded. */
export function UserManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const roleParam = params.get('role');
  const role = ROLES.includes(roleParam as Role) ? (roleParam as Role) : undefined;
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => update({ q: search.trim() || undefined, page: undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update() is recreated each render
  }, [search, q]);

  const { data, isPending, isFetching, error } = useQuery(
    usersQuery({ page, pageSize: PAGE_SIZE, q: q || undefined, role }),
  );
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.admin.users.searchPlaceholder}
            aria-label={t.admin.users.searchLabel}
            className="pl-8"
          />
        </div>
        <Select
          value={role ?? ALL}
          onValueChange={(value) =>
            update({ role: value === ALL ? undefined : value, page: undefined })
          }
        >
          <SelectTrigger className="w-full sm:w-44" aria-label={t.admin.users.filterRole}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.admin.users.allRoles}</SelectItem>
            <SelectItem value="STUDENT">{t.admin.users.students}</SelectItem>
            <SelectItem value="INSTRUCTOR">{t.admin.users.instructors}</SelectItem>
            <SelectItem value="ADMIN">{t.admin.users.admins}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <Skeleton className="rounded-card h-64 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t.admin.users.emptyTitle}
          description={t.admin.users.emptyText}
        />
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <UsersTable users={data.items} />
        </div>
      )}

      {data && data.total > 0 && (
        <div className="text-muted-foreground flex items-center justify-between gap-4 text-sm">
          <span>
            {fmt(t.common.pageOf, {
              count: data.total,
              noun: t.admin.users.noun,
              page,
              pages: pageCount,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              {t.common.previous}
            </Button>
            <Button
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => update({ page: String(page + 1) })}
            >
              {t.common.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
