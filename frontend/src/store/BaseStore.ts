/**
 * Generic typed store with a tiny pub-sub.
 *
 * Stores are the only place global state lives. Components are forbidden
 * from mutating store state directly: they read via `getState()`, listen
 * via `subscribe()`, and call domain-specific setter methods exposed by
 * each concrete store.
 */

export type Listener<T> = (state: Readonly<T>) => void;
export type Unsubscribe = () => void;

export class BaseStore<T extends object> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initial: T) {
    this.state = initial;
  }

  getState(): Readonly<T> {
    return this.state;
  }

  /**
   * Merge a partial update into the state and notify subscribers.
   *
   * Skips notification when the partial doesn't actually change anything
   * (shallow equality on each key) — this prevents accidental render loops
   * when fetch results are written back to the store.
   *
   * Subclasses typically wrap this in domain methods rather than exposing
   * setState directly to consumers.
   */
  protected setState(partial: Partial<T>): void {
    let changed = false;
    for (const key in partial) {
      if (!Object.is(this.state[key], partial[key] as T[Extract<keyof T, string>])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l(this.state);
  }

  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
