import type { ParseResult } from '@/domain/types';

/** User-facing validation failure; `message` is safe to show in the UI. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: number) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

/** Returns the parsed value or throws a ValidationError with the parser's message. */
export function unwrap<T>(result: ParseResult<T>): T {
  if (!result.ok) throw new ValidationError(result.error);
  return result.value;
}
