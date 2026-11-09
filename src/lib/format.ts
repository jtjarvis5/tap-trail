import type { Pint } from './types';

export function formatRating(r: number): string {
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function guinnessAverage(p: Pint): number | null {
  const scores = [p.pour_score, p.head_score, p.temp_score, p.creamy_score].filter(
    (s): s is number => typeof s === 'number'
  );
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
