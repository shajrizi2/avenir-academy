import type { TransformFnParams } from 'class-transformer';

/** class-transformer helper: trim strings, pass anything else through for the validators. */
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Trim + lowercase, used for emails. */
export const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Trim strings; an empty string becomes null ("clear this field"). */
export const emptyToNull = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};
