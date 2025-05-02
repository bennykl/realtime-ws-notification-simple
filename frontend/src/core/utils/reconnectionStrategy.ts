export interface ReconnectOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  jitter?: boolean;
}

/**
 * Calculates the delay for the next reconnection attempt using exponential backoff with optional jitter
 * @param attempt - Current attempt number (1-based)
 * @param options - Reconnection options
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  options: ReconnectOptions
): number {
  // Calculate base delay using exponential backoff
  const baseDelay = Math.min(
    options.initialDelay * Math.pow(options.factor, attempt - 1),
    options.maxDelay
  );

  // Add jitter if enabled (random value between 0 and 0.5 of the base delay)
  if (options.jitter) {
    const jitter = Math.random() * baseDelay * 0.5;
    return Math.floor(baseDelay + jitter);
  }

  return Math.floor(baseDelay);
}

/**
 * Determines if a reconnection should be attempted based on the current state and options
 * @param attempt - Current attempt number
 * @param options - Reconnection options
 * @returns boolean indicating if reconnection should be attempted
 */
export function shouldReconnect(
  attempt: number,
  options: ReconnectOptions
): boolean {
  return attempt <= options.maxAttempts;
}

/**
 * Formats a reconnection message for logging
 * @param attempt - Current attempt number
 * @param delay - Delay in milliseconds
 * @returns Formatted message string
 */
export function formatReconnectMessage(attempt: number, delay: number): string {
  return `Reconnection attempt ${attempt} in ${delay}ms`;
}
