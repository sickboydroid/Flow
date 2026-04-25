/**
 * Periodically refreshes any DOM element with `data-live-ts` (an ISO
 * timestamp) so its visible "X seconds ago" text stays current without
 * re-fetching from the server.
 *
 * The element's text is rebuilt as `${timeSince(ts)}${suffix}` where the
 * suffix defaults to " ago" but can be overridden per-element via
 * `data-live-ts-suffix=""` (empty for no suffix, e.g. "5s" alone).
 *
 * Ticks every second so users see a smooth 1s → 2s → … → 1m → 2m count up.
 */

import { timeSince } from './time';

const DEFAULT_INTERVAL_MS = 1_000;

export class LiveTimestampTicker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;
  private readonly extraTicks: Set<() => void> = new Set();

  constructor(intervalMs: number = DEFAULT_INTERVAL_MS) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.tick();
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /**
   * Register a callback to run on every tick. Useful for "X entries in last
   * Y minutes" labels that aren't backed by a single timestamp element.
   * Returns an unsubscribe.
   */
  onTick(fn: () => void): () => void {
    this.extraTicks.add(fn);
    return () => {
      this.extraTicks.delete(fn);
    };
  }

  private tick(): void {
    const elements = document.querySelectorAll<HTMLElement>('[data-live-ts]');
    for (const el of elements) {
      const ts = el.dataset.liveTs;
      if (!ts) continue;
      const suffix = el.dataset.liveTsSuffix ?? ' ago';
      el.textContent = `${timeSince(ts)}${suffix}`;
    }
    for (const fn of this.extraTicks) {
      try {
        fn();
      } catch (e) {
        console.error('[LiveTimestampTicker] onTick callback failed', e);
      }
    }
  }
}

/** Process-wide ticker so any component can register/unregister tick callbacks. */
export const liveTimestampTicker = new LiveTimestampTicker();
