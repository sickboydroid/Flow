/**
 * Minimal in-memory router.
 *
 * Pages are registered by name (`dashboard`, `students`, etc.) along with a
 * mount element. `navigate()` hides every other page's element and calls
 * `onEnter`/`onLeave` hooks. URLs are deliberately not touched — current UX
 * has no real routing, only tab switching.
 */

export interface PageDef {
  name: string;
  /** The element that should be visible when this page is active. */
  view: HTMLElement;
  /** Display style to apply when active (e.g. 'flex', 'grid'). */
  display: string;
  /** Called every time this page becomes active. */
  onEnter?: () => void;
  /** Called every time this page is left for another. */
  onLeave?: () => void;
}

export class Router {
  private pages = new Map<string, PageDef>();
  private current: string | null = null;
  private listeners: Array<(name: string) => void> = [];

  register(page: PageDef): void {
    this.pages.set(page.name, page);
    page.view.classList.add('hidden');
    page.view.classList.remove('flex', 'grid');
  }

  navigate(name: string): void {
    const next = this.pages.get(name);
    if (!next) throw new Error(`Router: unknown page "${name}"`);
    if (this.current === name) return;

    if (this.current) {
      const prev = this.pages.get(this.current);
      if (prev) {
        prev.view.classList.add('hidden');
        prev.view.classList.remove(prev.display);
        prev.onLeave?.();
      }
    }

    next.view.classList.remove('hidden');
    next.view.classList.add(next.display);
    next.onEnter?.();
    this.current = name;
    for (const l of this.listeners) l(name);
  }

  getCurrent(): string | null {
    return this.current;
  }

  /** Subscribe to navigation changes. */
  onChange(listener: (name: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
