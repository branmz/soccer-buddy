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

/** A message safe to show the coach. Unexpected errors are logged, not shown verbatim. */
export function userMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  console.error(error);
  return 'Something went wrong. Please try again.';
}

/** Returns the parsed value or throws a ValidationError with the parser's message. */
export function unwrap<T>(result: ParseResult<T>): T {
  if (!result.ok) throw new ValidationError(result.error);
  return result.value;
}
