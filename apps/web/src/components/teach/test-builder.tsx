'use client';

import type { StaffTest } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Eye, EyeOff, Lock, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormError } from '@/components/form-error';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { moduleQuery, testBuilderQuery } from '@/lib/queries';
import { QuestionsEditor, QuestionsPreview, type QuestionsValues } from './questions-editor';
import { TestSettingsForm, type TestSettingsValues } from './test-settings-form';

const m = t.teach.test;

/** /teach/modules/[id]/test: create the module's test, write its questions and publish it. */
export function TestBuilder() {
  const { id: moduleId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const builder = useQuery(testBuilderQuery(moduleId));
  const moduleInfo = useQuery(moduleQuery(moduleId));

  if (builder.isPending || moduleInfo.isPending) {
    return <Skeleton className="rounded-card h-96 w-full" />;
  }
  if (builder.error || moduleInfo.error) {
    return <FormError message={errorMessage(builder.error ?? moduleInfo.error)} />;
  }

  const { test, defaultWindow } = builder.data;
  const saved = async (next: StaffTest, message: string) => {
    toast.success(message);
    queryClient.setQueryData(testBuilderQuery(moduleId).queryKey, { test: next, defaultWindow });
    await queryClient.invalidateQueries({ queryKey: ['modules', moduleId], exact: true });
  };

  async function saveSettings(values: TestSettingsValues) {
    const next = test
      ? await apiFetch<StaffTest>(`/tests/${test.id}`, { method: 'PATCH', body: values })
      : await apiFetch<StaffTest>(`/modules/${moduleId}/test`, { method: 'POST', body: values });
    await saved(next, test ? m.settingsSaved : m.created);
  }

  async function saveQuestions(values: QuestionsValues) {
    if (!test) return;
    const next = await apiFetch<StaffTest>(`/tests/${test.id}/questions`, {
      method: 'PUT',
      body: values,
    });
    await saved(next, m.questionsSaved);
  }

  return (
    <>
      <Link
        href={`/teach/modules/${moduleId}`}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />{' '}
        {fmt(t.teach.module.title, { number: moduleInfo.data.order, title: moduleInfo.data.title })}
      </Link>
      <PageHeader
        title={test ? test.title : m.createTitle}
        description={m.builderDescription}
        actions={
          test && (
            <Button asChild variant="chunky-outline">
              <Link href={`/teach/modules/${moduleId}/results`}>
                <BarChart3 data-icon="inline-start" /> {m.results}
              </Link>
            </Button>
          )
        }
      />

      {test && <PublishCard test={test} onSaved={saved} />}

      <Card>
        <CardHeader>
          <CardTitle as="h2">{m.settings}</CardTitle>
        </CardHeader>
        <CardContent>
          <TestSettingsForm
            key={test?.id ?? 'new'}
            test={test}
            defaultWindow={defaultWindow}
            defaultTitle={fmt(m.defaultTitle, { module: moduleInfo.data.title })}
            onSubmit={saveSettings}
          />
        </CardContent>
      </Card>

      {test && (
        <section aria-labelledby="questions-title" className="space-y-4">
          <div className="space-y-1">
            <h2 id="questions-title" className="text-ink text-subheading font-extrabold">
              {m.questions}
            </h2>
            <p className="text-ink-soft">{m.questionsHint}</p>
          </div>
          {test.attemptCount > 0 ? (
            <>
              <p className="border-line rounded-card bg-locked-tint text-locked-ink flex items-start gap-2 border p-4 text-sm font-semibold">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                {m.lockedHint}
              </p>
              <QuestionsPreview questions={test.questions} />
            </>
          ) : (
            <QuestionsEditor
              // Start from the saved questions after every save.
              key={JSON.stringify(test.questions)}
              questions={test.questions}
              onSave={saveQuestions}
            />
          )}
        </section>
      )}
    </>
  );
}

function PublishCard({
  test,
  onSaved,
}: {
  test: StaffTest;
  onSaved: (next: StaffTest, message: string) => Promise<void>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function togglePublished() {
    try {
      const next = await apiFetch<StaffTest>(`/tests/${test.id}/publish`, {
        method: 'PATCH',
        body: { isPublished: !test.isPublished },
      });
      await onSaved(next, next.isPublished ? m.publishedToast : m.hiddenToast);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await apiFetch(`/tests/${test.id}`, { method: 'DELETE' });
      toast.success(m.deleted);
      await queryClient.invalidateQueries({ queryKey: ['modules', test.moduleId] });
      router.push(`/teach/modules/${test.moduleId}`);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <Card className={test.isPublished ? 'bg-passed-tint border-transparent' : undefined}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle as="h2">{m.visibility}</CardTitle>
            <Badge variant={test.isPublished ? 'secondary' : 'outline'}>
              {test.isPublished ? m.published : m.draft}
            </Badge>
          </div>
          <CardDescription className="text-ink">
            {test.isPublished
              ? m.visiblePublished
              : test.questions.length === 0
                ? m.visibleNoQuestions
                : m.visibleDraft}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={test.isPublished ? 'chunky-outline' : 'chunky'}
            onClick={() => void togglePublished()}
            disabled={!test.isPublished && test.questions.length === 0}
          >
            {test.isPublished ? (
              <>
                <EyeOff data-icon="inline-start" /> {m.unpublish}
              </>
            ) : (
              <>
                <Eye data-icon="inline-start" /> {m.publish}
              </>
            )}
          </Button>
          {test.attemptCount === 0 && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" aria-label={m.deleteAria}>
                  <Trash2 />
                </Button>
              }
              title={m.deleteTitle}
              description={m.deleteText}
              confirmLabel={m.deleteConfirm}
              onConfirm={remove}
            />
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
