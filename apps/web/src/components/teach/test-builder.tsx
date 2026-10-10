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
import { apiFetch, errorMessage } from '@/lib/api';
import { moduleQuery, testBuilderQuery } from '@/lib/queries';
import { QuestionsEditor, QuestionsPreview, type QuestionsValues } from './questions-editor';
import { TestSettingsForm, type TestSettingsValues } from './test-settings-form';

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
    await saved(next, test ? 'Test settings saved' : 'Test created. Now add the questions.');
  }

  async function saveQuestions(values: QuestionsValues) {
    if (!test) return;
    const next = await apiFetch<StaffTest>(`/tests/${test.id}/questions`, {
      method: 'PUT',
      body: values,
    });
    await saved(next, 'Questions saved');
  }

  return (
    <>
      <Link
        href={`/teach/modules/${moduleId}`}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Module {moduleInfo.data.order}:{' '}
        {moduleInfo.data.title}
      </Link>
      <PageHeader
        title={test ? test.title : 'Create the module test'}
        description="Students take it online during its window. Passing it unlocks the next module."
        actions={
          test && (
            <Button asChild variant="chunky-outline">
              <Link href={`/teach/modules/${moduleId}/results`}>
                <BarChart3 data-icon="inline-start" /> Results
              </Link>
            </Button>
          )
        }
      />

      {test && <PublishCard test={test} onSaved={saved} />}

      <Card>
        <CardHeader>
          <CardTitle as="h2">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <TestSettingsForm
            key={test?.id ?? 'new'}
            test={test}
            defaultWindow={defaultWindow}
            defaultTitle={`${moduleInfo.data.title}: Module Test`}
            onSubmit={saveSettings}
          />
        </CardContent>
      </Card>

      {test && (
        <section aria-labelledby="questions-title" className="space-y-4">
          <div className="space-y-1">
            <h2 id="questions-title" className="text-ink text-subheading font-extrabold">
              Questions
            </h2>
            <p className="text-ink-soft">
              A question scores its points only when the student picks exactly the correct answers.
            </p>
          </div>
          {test.attemptCount > 0 ? (
            <>
              <p className="border-line rounded-card bg-locked-tint text-locked-ink flex items-start gap-2 border p-4 text-sm font-semibold">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                Students have already taken this test, so its questions can’t change. You can still
                edit the settings and the window.
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
      await onSaved(next, next.isPublished ? 'Test published' : 'Test hidden from students');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await apiFetch(`/tests/${test.id}`, { method: 'DELETE' });
      toast.success('Test deleted');
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
            <CardTitle as="h2">Visibility</CardTitle>
            <Badge variant={test.isPublished ? 'secondary' : 'outline'}>
              {test.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <CardDescription className="text-ink">
            {test.isPublished
              ? 'Students see this test on the module page and can take it during its window.'
              : test.questions.length === 0
                ? 'Add questions, then publish the test so students can see it.'
                : 'Students can’t see the test until you publish it.'}
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
                <EyeOff data-icon="inline-start" /> Unpublish
              </>
            ) : (
              <>
                <Eye data-icon="inline-start" /> Publish
              </>
            )}
          </Button>
          {test.attemptCount === 0 && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete test">
                  <Trash2 />
                </Button>
              }
              title="Delete this test?"
              description="Its settings and questions are removed. Nobody has taken it yet."
              confirmLabel="Delete test"
              onConfirm={remove}
            />
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
