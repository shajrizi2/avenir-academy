'use client';

import type { ModuleTest } from '@ai-academy/shared';
import { BarChart3, ClipboardList, FilePlus2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { TestWindow } from '@/components/tests/test-window';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmt, plural, t } from '@/i18n/messages';

const m = t.teach.test;

/** The module's test on the manage page: a summary with links to the builder and results. */
export function TestPanel({ moduleId, test }: { moduleId: string; test: ModuleTest | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle as="h2" className="flex items-center gap-2">
          <ClipboardList className="size-5" aria-hidden /> {m.panelTitle}
        </CardTitle>
        {test && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/teach/modules/${moduleId}/test`}>
                <Pencil data-icon="inline-start" /> {m.edit}
              </Link>
            </Button>
            <Button asChild variant="chunky" size="sm">
              <Link href={`/teach/modules/${moduleId}/results`}>
                <BarChart3 data-icon="inline-start" /> {m.results}
              </Link>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {test ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-ink font-bold">{test.title}</p>
              <Badge variant={test.isPublished ? 'secondary' : 'outline'}>
                {test.isPublished ? m.published : m.draft}
              </Badge>
            </div>
            <p className="text-ink-soft text-sm">
              {fmt(m.facts, {
                questions: fmt(t.common.count.questions, { count: test.questionCount }),
                passMark: test.passMark,
                minutes: test.timeLimitMin,
                attempts: plural(test.maxAttempts, m.attempt, m.attempts),
              })}
            </p>
            <p className="text-ink-soft text-sm">
              {m.open} <TestWindow test={test} />
            </p>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={m.emptyTitle}
            description={m.emptyText}
            action={
              <Button asChild variant="chunky">
                <Link href={`/teach/modules/${moduleId}/test`}>
                  <FilePlus2 data-icon="inline-start" /> {m.create}
                </Link>
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
