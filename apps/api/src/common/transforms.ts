import type { TransformFnParams } from 'class-transformer';

/** class-transformer helper: trim strings, pass anything else through for the validators. */
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Trim + lowercase, used for emails. */
export const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
