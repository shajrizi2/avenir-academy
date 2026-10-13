'use client';

import { type PublicUser, ROLES, type Role } from '@ai-academy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fmt, t } from '@/i18n/messages';

export function RoleSelect({ user }: { user: PublicUser }) {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const isSelf = me?.id === user.id;

  const mutation = useMutation({
    mutationFn: (role: Role) =>
      apiFetch<PublicUser>(`/users/${user.id}/role`, { method: 'PATCH', body: { role } }),
    onSuccess: (updated) => {
      toast.success(
        fmt(t.admin.users.roleChanged, {
          name: `${updated.firstName} ${updated.lastName}`,
          role: t.status.role[updated.role],
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Select
      value={user.role}
      onValueChange={(role) => mutation.mutate(role as Role)}
      disabled={isSelf || mutation.isPending}
    >
      <SelectTrigger
        className="w-36"
        aria-label={fmt(t.admin.users.roleFor, { name: `${user.firstName} ${user.lastName}` })}
        title={isSelf ? t.admin.users.cannotChangeOwnRole : undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {t.status.role[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
