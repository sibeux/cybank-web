// src/lib/date.ts

/**
 * Returns a local datetime string in 'YYYY-MM-DDTHH:mm' format suitable for HTML datetime-local inputs.
 * Uses local client timezone instead of UTC.
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

