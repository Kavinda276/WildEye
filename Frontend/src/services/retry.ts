const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn`, retrying on failure with a linear backoff.
 * Rethrows the last error if every attempt fails.
 */
export const withRetry = async <T,>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await delay(baseDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
};

export const SERVER_UNREACHABLE_MESSAGE =
  "Cannot reach the server. Showing the last available data — retrying when the connection returns.";