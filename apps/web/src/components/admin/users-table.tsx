'use client';

import type { PublicUser } from '@ai-academy/shared';
import { LocalDateTime } from '@/components/local-date-time';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleSelect } from './role-select';

/** Table on md+ screens, stacked cards on phones. */
export function UsersTable({ users }: { users: PublicUser[] }) {
  return (
    <>
      <div className="hidden rounded-xl border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="pr-4">Role</TableHead>
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
                  <LocalDateTime value={user.createdAt} options={{ dateStyle: 'medium' }} />
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
          <li key={user.id} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-muted-foreground truncate text-sm">{user.email}</p>
              <p className="text-muted-foreground text-xs">
                Joined <LocalDateTime value={user.createdAt} options={{ dateStyle: 'medium' }} />
              </p>
            </div>
            <RoleSelect user={user} />
          </li>
        ))}
      </ul>
    </>
  );
}
