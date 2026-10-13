'use client';

import type { PublicUser } from '@ai-academy/shared';
import { formatDate, LocalDateTime } from '@/components/local-date-time';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fmt, t } from '@/i18n/messages';
import { RoleSelect } from './role-select';

/** Table on md+ screens, stacked cards on phones. */
export function UsersTable({ users }: { users: PublicUser[] }) {
  return (
    <>
      <div className="border-line rounded-card bg-background hidden overflow-hidden border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">{t.admin.users.name}</TableHead>
              <TableHead>{t.admin.users.email}</TableHead>
              <TableHead>{t.admin.users.phone}</TableHead>
              <TableHead>{t.admin.users.joined}</TableHead>
              <TableHead className="pr-4">{t.admin.users.role}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="pl-4 font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-muted-foreground">{user.phone ?? '–'}</TableCell>
                <TableCell className="text-muted-foreground">
                  <LocalDateTime value={user.createdAt} style="date" />
                </TableCell>
                <TableCell className="pr-4">
                  <RoleSelect user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="border-line rounded-card bg-background space-y-3 border p-4">
            <div className="min-w-0">
              <p className="text-ink font-bold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-muted-foreground truncate text-sm">{user.email}</p>
              <p className="text-muted-foreground text-xs">
                {fmt(t.admin.users.joinedOn, { date: formatDate(user.createdAt, 'date') })}
              </p>
            </div>
            <RoleSelect user={user} />
          </li>
        ))}
      </ul>
    </>
  );
}
