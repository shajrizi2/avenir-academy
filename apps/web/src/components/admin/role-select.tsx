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

const LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
};

export function RoleSelect({ user }: { user: PublicUser }) {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const isSelf = me?.id === user.id;

  const mutation = useMutation({
    mutationFn: (role: Role) =>
      apiFetch<PublicUser>(`/users/${user.id}/role`, { method: 'PATCH', body: { role } }),
    onSuccess: (updated) => {
      toast.success(`${updated.firstName} ${updated.lastName} is now ${LABELS[updated.role]}`);
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
        aria-label={`Role for ${user.firstName} ${user.lastName}`}
        title={isSelf ? 'You cannot change your own role' : undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
