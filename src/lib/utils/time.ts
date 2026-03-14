import { formatDistanceToNow, differenceInHours, format } from 'date-fns';

export function getAgeLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getFreshness(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = differenceInHours(new Date(), d);
  const freshness = 1 - hours / 168; // 168 hours = 7 days
  return Math.max(0, Math.min(1, freshness));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}
