export interface ReconnectOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

export function calculateBackoff(
  attempt: number,
  options: ReconnectOptions
): number {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.factor, attempt - 1),
    options.maxDelay
  );
  return Math.floor(delay);
}
