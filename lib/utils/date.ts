import { format, parseISO, isValid } from 'date-fns';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'MMM d, yyyy HH:mm');
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'HH:mm');
}

export function toISOString(): string {
  return new Date().toISOString();
}

export function getDateParts(date: string): { year: string; month: string; day: string } {
  const [year, month, day] = date.split('-');
  return { year, month, day };
}

export function formatDateForPath(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
