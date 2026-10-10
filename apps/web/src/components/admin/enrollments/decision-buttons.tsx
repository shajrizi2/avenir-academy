'use client';

import type { AdminEnrollment, DecideEnrollmentInput } from '@ai-academy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, errorMessage } from '@/lib/api';

/** Approve (opens module 1 for the student) or reject, with an optional internal note. */
export function DecisionButtons({ enrollment }: { enrollment: AdminEnrollment }) {
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const name = `${enrollment.user.firstName} ${enrollment.user.lastName}`;

  const decide = useMutation({
    mutationFn: (body: DecideEnrollmentInput) =>
      apiFetch<AdminEnrollment>(`/enrollments/${enrollment.id}`, { method: 'PATCH', body }),
    onSuccess: (updated) => {
      toast.success(
        updated.status === 'APPROVED'
          ? `${name} is enrolled. Module 1 is now open for them.`
          : `Request from ${name} declined.`,
      );
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="chunky"
        size="sm"
        disabled={decide.isPending}
        onClick={() => decide.mutate({ status: 'APPROVED' })}
      >
        <Check data-icon="inline-start" /> Approve
      </Button>
      {enrollment.status === 'PENDING' && (
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={decide.isPending}>
              <X data-icon="inline-start" /> Decline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline this request?</DialogTitle>
              <DialogDescription>
                {name} asked to join {enrollment.course.title}. You can still approve it later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor={`note-${enrollment.id}`}>Internal note (optional)</Label>
              <Textarea
                id={`note-${enrollment.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="e.g. Course is full; offered a seat in the next cohort"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="chunky-outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ status: 'REJECTED', note: note || undefined })}
              >
                Decline request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
