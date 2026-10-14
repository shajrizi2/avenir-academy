'use client';

import type { AdminEnrollment } from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { adminGroupsQuery } from '@/lib/queries';

/** Waitlist (or expired/cancelled) → a group with a free seat; the student gets 48 hours to pay. */
export function MoveDialog({ enrollment }: { enrollment: AdminEnrollment }) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState('');
  const queryClient = useQueryClient();
  const groups = useQuery({ ...adminGroupsQuery(enrollment.course.id), enabled: open });
  const g = t.adminLaunch.groups;

  const move = useMutation({
    mutationFn: () =>
      apiFetch<AdminEnrollment>(`/enrollments/${enrollment.id}/move`, {
        method: 'PATCH',
        body: { groupId },
      }),
    onSuccess: () => {
      toast.success(g.moved);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="chunky-outline" size="sm">
          <ArrowRightLeft data-icon="inline-start" /> {g.moveToGroup}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{g.moveTitle}</DialogTitle>
          <DialogDescription>{g.moveText}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`move-${enrollment.id}`}>
            {g.course}: {enrollment.course.title}
          </Label>
          <select
            id={`move-${enrollment.id}`}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="border-input bg-background text-ink focus-visible:border-ink focus-visible:ring-ring/40 h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-3"
          >
            <option value="">—</option>
            {(groups.data ?? [])
              .filter((x) => x.status === 'OPEN' || x.status === 'FULL')
              .map((x) => (
                <option key={x.id} value={x.id} disabled={x.seatsLeft === 0}>
                  {x.name} · {fmt(g.seats, { left: x.seatsLeft, capacity: x.capacity })}
                </option>
              ))}
          </select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="chunky-outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button
            variant="chunky"
            disabled={!groupId || move.isPending}
            onClick={() => move.mutate()}
          >
            {g.moveToGroup}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
