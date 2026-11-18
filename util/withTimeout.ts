/**
 * Wraps any promise so that if it stays pending longer than `ms`,
 * it rejects with a TimeoutError.
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage?: string,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(
        new (class extends TimeoutError {
          constructor() {
            super(ms);
            this.message = errorMessage ?? `Timeout after ${ms} ms`;
          }
        })(),
      );
    }, ms);
  });

  return Promise.race([promise, timeout]);
}
