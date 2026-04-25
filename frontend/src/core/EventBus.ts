/**
 * Tiny typed pub-sub for cross-cutting events. Use for things that span
 * multiple unrelated components (e.g. "a vehicle log was just added —
 * the Vehicles tab should refetch if active").
 *
 * Within a single component tree, prefer custom DOM events from
 * `Component.emit()`.
 */

export interface AppEvents {
  /** A log of the given domain was created or modified. */
  'logs:changed': { domain: 'student' | 'vehicle' | 'visitor' };
  /** A successful RFID/manual scan was processed. */
  'scan:processed': { enrollment: string };
  /** Show a snackbar. */
  'snackbar:show': { message: string; type: 'success' | 'error' | 'info' };
}

type Handler<E> = (payload: E) => void;

class EventBusImpl {
  private handlers = new Map<keyof AppEvents, Set<Handler<unknown>>>();

  on<K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) (h as Handler<AppEvents[K]>)(payload);
  }
}

export const EventBus = new EventBusImpl();
