'use client';

import {
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  type QuestionType,
  questionsSchema,
  type StaffQuestion,
  TEST_MAX_QUESTIONS,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';
import { type FieldError, get, useFieldArray, useForm, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { TextareaField } from '@/components/form/textarea-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError as FieldErrorText, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { fmt, plural, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

type FormInput = z.input<typeof questionsSchema>;
export type QuestionsValues = z.output<typeof questionsSchema>;
type QuestionsForm = UseFormReturn<FormInput, unknown, QuestionsValues>;

const m = t.teach.questions;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = m.types;

const trueFalseOptions = () => [
  { text: m.true, isCorrect: true },
  { text: m.false, isCorrect: false },
];
const blankOptions = () => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
];
const blankQuestion = () => ({
  type: 'SINGLE_CHOICE' as const,
  text: '',
  points: 1,
  options: blankOptions(),
});

const toInput = (q: StaffQuestion) => ({
  type: q.type,
  text: q.text,
  points: q.points,
  options: q.options.map(({ text, isCorrect }) => ({ text, isCorrect })),
});

interface QuestionsEditorProps {
  questions: StaffQuestion[];
  onSave: (values: QuestionsValues) => Promise<unknown>;
}

/** Edits every question of a test at once; saving replaces them all (PUT /tests/:id/questions). */
export function QuestionsEditor({ questions, onSave }: QuestionsEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, QuestionsValues>({
    resolver: zodResolver(questionsSchema),
    defaultValues: {
      questions: questions.length > 0 ? questions.map(toInput) : [blankQuestion()],
    },
  });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSave(values);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
      <FormError message={error} />
      <ol className="space-y-6">
        {fields.map((field, index) => (
          <QuestionCard
            key={field.id}
            form={form}
            index={index}
            count={fields.length}
            onMove={(to) => move(index, to)}
            onRemove={() => remove(index)}
          />
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="chunky-outline"
          onClick={() => append(blankQuestion())}
          disabled={fields.length >= TEST_MAX_QUESTIONS}
        >
          <Plus data-icon="inline-start" /> {m.add}
        </Button>
        <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t.common.saving : m.save}
        </Button>
        {form.formState.isDirty && (
          <p className="text-active-ink text-sm font-semibold">{m.unsaved}</p>
        )}
      </div>
    </form>
  );
}

interface QuestionCardProps {
  form: QuestionsForm;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}

function QuestionCard({ form, index, count, onMove, onRemove }: QuestionCardProps) {
  const typeId = useId();
  const type = form.watch(`questions.${index}.type`);
  const options = form.watch(`questions.${index}.options`);
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: `questions.${index}.options`,
  });
  const multi = type === 'MULTI_CHOICE';
  const optionsError = get(form.formState.errors, `questions.${index}.options`) as
    (FieldError & { root?: FieldError }) | undefined;
  const optionsMessage = optionsError?.root?.message ?? optionsError?.message;

  function changeType(next: QuestionType) {
    if (next === 'TRUE_FALSE') {
      replace(trueFalseOptions());
    } else if (type === 'TRUE_FALSE') {
      replace(blankOptions());
    } else if (next === 'SINGLE_CHOICE') {
      // Keep only the first correct option.
      const first = options.findIndex((o) => o.isCorrect);
      options.forEach((_, i) => setCorrect(i, i === Math.max(first, 0)));
    }
  }

  function setCorrect(optionIndex: number, value: boolean) {
    form.setValue(`questions.${index}.options.${optionIndex}.isCorrect`, value, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  }

  function choose(optionIndex: number) {
    if (multi) {
      setCorrect(optionIndex, !options[optionIndex]?.isCorrect);
    } else {
      options.forEach((_, i) => setCorrect(i, i === optionIndex));
    }
  }

  const typeField = form.register(`questions.${index}.type`, {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
      changeType(e.target.value as QuestionType),
  });

  return (
    <li className="border-line rounded-card bg-background space-y-5 border p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-ink text-lg font-extrabold">
          {fmt(m.question, { number: index + 1 })}
        </h3>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={fmt(m.moveUp, { number: index + 1 })}
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={fmt(m.moveDown, { number: index + 1 })}
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={fmt(m.remove, { number: index + 1 })}
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_8rem]">
        <Field>
          <FieldLabel htmlFor={typeId}>{m.type}</FieldLabel>
          <select
            id={typeId}
            className="border-input bg-background text-ink focus-visible:border-ink focus-visible:ring-ring/40 h-11 w-full rounded-lg border px-3 text-base outline-none focus-visible:ring-3 md:text-sm"
            {...typeField}
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <TextField form={form} name={`questions.${index}.points`} label={m.points} type="number" />
      </div>
      <TextareaField form={form} name={`questions.${index}.text`} label={m.text} rows={2} />

      <fieldset className="space-y-3">
        <legend className="text-ink mb-1 text-sm font-semibold">
          {m.answers}{' '}
          <span className="text-ink-soft font-normal">({multi ? m.tickAll : m.pickOne})</span>
        </legend>
        <ul className="space-y-2">
          {fields.map((option, i) => {
            const correct = Boolean(options[i]?.isCorrect);
            const textError = get(form.formState.errors, `questions.${index}.options.${i}.text`) as
              FieldError | undefined;
            return (
              <li key={option.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <label
                    className={cn(
                      'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2',
                      correct
                        ? 'border-passed-ink bg-passed-tint text-passed-ink'
                        : 'border-line-strong text-ink-soft',
                    )}
                  >
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`correct-${typeId}`}
                      className="sr-only"
                      checked={correct}
                      onChange={() => choose(i)}
                      aria-label={fmt(m.answerCorrect, { number: i + 1 })}
                    />
                    {correct ? <Check className="size-5" aria-hidden /> : null}
                  </label>
                  <Input
                    aria-label={fmt(m.answer, { number: i + 1 })}
                    aria-invalid={Boolean(textError)}
                    readOnly={type === 'TRUE_FALSE'}
                    placeholder={fmt(m.answer, { number: i + 1 })}
                    {...form.register(`questions.${index}.options.${i}.text`)}
                  />
                  {type !== 'TRUE_FALSE' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={fmt(m.removeAnswer, { number: i + 1 })}
                      disabled={fields.length <= QUESTION_MIN_OPTIONS}
                      onClick={() => remove(i)}
                    >
                      <X />
                    </Button>
                  )}
                </div>
                {textError?.message && <FieldErrorText>{textError.message}</FieldErrorText>}
              </li>
            );
          })}
        </ul>
        {optionsMessage && <FieldErrorText>{optionsMessage}</FieldErrorText>}
        {type !== 'TRUE_FALSE' && fields.length < QUESTION_MAX_OPTIONS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ text: '', isCorrect: false })}
          >
            <Plus data-icon="inline-start" /> {m.addAnswer}
          </Button>
        )}
      </fieldset>
    </li>
  );
}

/** The questions as students will see them, with the correct answers marked. */
export function QuestionsPreview({ questions }: { questions: StaffQuestion[] }) {
  return (
    <ol className="space-y-4">
      {questions.map((q) => (
        <li
          key={q.id}
          className="border-line rounded-card bg-background space-y-3 border p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-ink font-extrabold">{fmt(m.question, { number: q.order })}</h3>
            <Badge variant="outline">{QUESTION_TYPE_LABELS[q.type]}</Badge>
            <Badge variant="secondary">{plural(q.points, m.point, m.pointsCount)}</Badge>
          </div>
          <p className="text-ink">{q.text}</p>
          <ul className="space-y-1">
            {q.options.map((o) => (
              <li
                key={o.id}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  o.isCorrect ? 'text-passed-ink font-bold' : 'text-ink-soft',
                )}
              >
                {o.isCorrect ? (
                  <Check className="size-4" aria-label={m.correct} />
                ) : (
                  <span className="size-4" aria-hidden />
                )}
                {o.text}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
