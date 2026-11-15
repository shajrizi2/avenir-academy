'use client';

import type { JobBoardStatus } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from '@/i18n/messages';
import { jobsFetch, useJobSeeker } from '@/lib/job-seeker';
import { CodeLoginForm } from './code-login-form';

/** How long a signed-out visitor browses before the sign-in pop-up (PLAN D37). */
export const GATE_DELAY_MS = 10_000;

const prevent = (event: Event) => event.preventDefault();

/**
 * After 10 seconds, a visitor who isn't signed in must sign in with their email to keep
 * browsing the board. The pop-up can't be closed; signing in closes it for a year on that
 * device. Nobody is blocked when the API can't be reached, or while the server can't email
 * the codes (production with MAIL_TRANSPORT=console; PLAN D38).
 */
export function SignInGate() {
  const me = useJobSeeker();
  const status = useQuery({
    queryKey: ['job-board-status'],
    queryFn: () => jobsFetch<JobBoardStatus>('/jobs/status'),
    staleTime: 5 * 60_000,
  });
  const [due, setDue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDue(true), GATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const open = due && status.data?.signIn === true && me.isSuccess && me.data === null;
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={prevent}
        onPointerDownOutside={prevent}
        onInteractOutside={prevent}
      >
        <DialogHeader>
          <DialogTitle>{t.jobs.login.title}</DialogTitle>
          <DialogDescription>{t.jobs.login.lead}</DialogDescription>
        </DialogHeader>
        <CodeLoginForm />
      </DialogContent>
    </Dialog>
  );
}
