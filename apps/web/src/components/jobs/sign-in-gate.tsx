'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from '@/i18n/messages';
import { useJobSeeker } from '@/lib/job-seeker';
import { CodeLoginForm } from './code-login-form';

/** How long a signed-out visitor browses before the sign-in pop-up (PLAN D37). */
export const GATE_DELAY_MS = 10_000;

const prevent = (event: Event) => event.preventDefault();

/**
 * After 10 seconds, a visitor who isn't signed in must sign in with their email to keep
 * browsing the board. The pop-up can't be closed; signing in closes it for a year on that
 * device. If the API can't be reached, nobody is blocked.
 */
export function SignInGate() {
  const me = useJobSeeker();
  const [due, setDue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDue(true), GATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const open = due && me.isSuccess && me.data === null;
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
