/**
 * Date / time helpers. Pure functions, no DOM.
 */

/** Human "time since" e.g. "5m", "3h 12m", "2d 4h", "1mo". `null` → "—". */
export function timeSince(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.abs(Date.now() - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ${hours % 24}h`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

/** Format a duration in milliseconds as "Xd Yh", "Xh Ym", or "Xm". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

/** Locale "10:42 AM" — "—" for null/invalid. */
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Locale "25 Apr 26" — "—" for null/invalid. */
export function formatShortDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

/** Locale "25 Apr 2026". */
export function formatLongDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "25/04/2026 10:42 AM" combo for dialogs. */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN')} ${formatTime(d)}`;
}

/**
 * Coarse human "window" length used for subtitles like
 * "12 entries in the last 2 hours". Always returns a single rounded unit.
 */
export function formatRelativeWindow(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'moment';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return secs <= 1 ? 'second' : `${secs} seconds`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return mins === 1 ? 'minute' : `${mins} minutes`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? 'hour' : `${hours} hours`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? 'day' : `${days} days`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? 'month' : `${months} months`;
  const years = Math.round(months / 12);
  return years === 1 ? 'year' : `${years} years`;
}
