import type { TransformFnParams } from 'class-transformer';

export const trim = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value;

export const normalizeEmail = (params: TransformFnParams) => {
  const trimmed = trim(params);
  return typeof trimmed === 'string' ? trimmed.toLowerCase() : trimmed;
};
