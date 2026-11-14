'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { jobsFetch } from '@/lib/job-seeker';

const copy = t.unsubscribe;

/** The link in every campaign email. A button, so link scanners in mail apps can't unsubscribe. */
export function Unsubscribe() {
  const params = useSearchParams();
  const id = params.get('id');
  const token = params.get('t');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!id || !token) return <p className="text-ink">{copy.invalid}</p>;
  if (state === 'done')
    return (
      <p className="text-ink font-semibold" role="status">
        {copy.done}
      </p>
    );

  async function confirm() {
    setState('busy');
    setError(null);
    try {
      await jobsFetch('/job-seekers/unsubscribe', { method: 'POST', body: { id, token } });
      setState('done');
    } catch (e) {
      setError(errorMessage(e));
      setState('idle');
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Button variant="chunky" size="lg" disabled={state === 'busy'} onClick={() => void confirm()}>
        {copy.button}
      </Button>
    </div>
  );
}
