/**
 * Thin fetch wrapper used by every API module.
 *
 * Centralizes:
 *   - the API base URL
 *   - JSON encode/decode
 *   - swallow-and-warn behavior so callers can tolerate transient outages
 *     (the dashboard's `init()` already shows a friendly snackbar in that
 *     case)
 */

import { EventBus } from '../core/EventBus';

export const API_BASE = 'http://localhost:5000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** When true, a network/parsing failure shows a snackbar via EventBus. */
  notifyOnFailure?: boolean;
}

/**
 * Perform an API request and return the parsed JSON, or `null` on any kind
 * of failure (network, non-2xx, parse error). Designed for read paths where
 * "no data" is an acceptable degraded state.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T | null> {
  const { method = 'GET', body, notifyOnFailure = false } = options;

  try {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
      if (notifyOnFailure) notifyError(`Request failed (${res.status})`);
      return null;
    }
    if (res.status === 204) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error('[Flow] api request failed', path, e);
    if (notifyOnFailure) notifyError('Network error — is the server running?');
    return null;
  }
}

/** Convenience for "did this request succeed?" mutations that ignore the body. */
export async function apiOk(path: string, options: RequestOptions = {}): Promise<boolean> {
  const { method = 'GET', body } = options;
  try {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, init);
    return res.ok;
  } catch (e) {
    console.error('[Flow] api request failed', path, e);
    return false;
  }
}

/** Build a query string from a flat record, skipping null/undefined/empty. */
export function qs(params: Record<string, string | number | null | undefined>): string {
  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    entries.push([k, String(v)]);
  }
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

function notifyError(message: string): void {
  EventBus.emit('snackbar:show', { message, type: 'error' });
}
