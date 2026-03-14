/**
 * Get the URL for an HTTP status code animal image.
 */
export function getAnimalUrl(
  statusCode: number,
  preference: 'cats' | 'dogs' | 'random' = 'cats'
): string {
  const useDog =
    preference === 'dogs' || (preference === 'random' && Math.random() > 0.5);

  if (useDog) {
    return `https://http.dog/${statusCode}.jpg`;
  }
  return `https://http.cat/${statusCode}`;
}

/**
 * Get a common status code from an error message or status.
 */
export function inferStatusCode(status?: number, message?: string): number {
  if (status) return status;
  if (!message) return 500;

  const lower = message.toLowerCase();
  if (lower.includes('not found') || lower.includes('404')) return 404;
  if (lower.includes('rate limit') || lower.includes('too many')) return 429;
  if (lower.includes('timeout') || lower.includes('timed out')) return 408;
  if (lower.includes('unauthorized') || lower.includes('auth')) return 401;
  if (lower.includes('forbidden')) return 403;
  return 500;
}
