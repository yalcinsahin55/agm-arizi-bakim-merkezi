export type DateLike = Date | string | number | null | undefined;

export function toValidDate(value: DateLike): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (value === null || value === undefined || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function dateStart(value: string | null): Date | undefined {
  return value ? toValidDate(`${value}T00:00:00`) : undefined;
}

export function dateEnd(value: string | null): Date | undefined {
  return value ? toValidDate(`${value}T23:59:59.999`) : undefined;
}

export function minutesBetween(start: DateLike, end: DateLike): number | null {
  const a = toValidDate(start);
  const b = toValidDate(end);
  if (!a || !b) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export function average(values: number[]): number | null {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

export function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
