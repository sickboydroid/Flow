/**
 * Base class for every UI component in the app.
 *
 * Lifecycle:
 *   new Comp(root, props)  →  comp.mount()  →  ... use ...  →  comp.unmount()
 *
 * Subclasses override `render()` to populate `this.root` (typically by
 * assigning an imported `*.html?raw` template) and `bind()` to wire up DOM
 * listeners. All listeners attached through `this.on()` are tracked and
 * automatically removed in `unmount()`, so subclasses rarely need to clean
 * up manually.
 */

type Listener = {
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};

/** Subset of Component the parent needs to know about to manage lifecycle. */
interface Mountable {
  mount(): void;
  unmount(): void;
}

export abstract class Component<Props = void> {
  protected readonly root: HTMLElement;
  protected readonly props: Props;
  private listeners: Listener[] = [];
  private mounted = false;
  private children: Mountable[] = [];

  constructor(root: HTMLElement, props: Props) {
    this.root = root;
    this.props = props;
  }

  mount(): void {
    if (this.mounted) return;
    this.render();
    this.bind();
    this.mounted = true;
  }

  unmount(): void {
    if (!this.mounted) return;
    for (const child of this.children) child.unmount();
    this.children = [];
    for (const l of this.listeners) {
      l.target.removeEventListener(l.type, l.handler, l.options);
    }
    this.listeners = [];
    this.root.replaceChildren();
    this.mounted = false;
  }

  protected abstract render(): void;
  protected bind(): void {}

  /** Track a child so its lifecycle is tied to ours. */
  protected addChild<C extends Mountable>(child: C): C {
    this.children.push(child);
    child.mount();
    return child;
  }

  protected $<T extends HTMLElement = HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Component: required selector not found: ${selector}`);
    return el;
  }

  protected $maybe<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.root.querySelector<T>(selector);
  }

  protected $$<T extends HTMLElement = HTMLElement>(selector: string): T[] {
    return Array.from(this.root.querySelectorAll<T>(selector));
  }

  /** Attach a tracked event listener. Listener is auto-removed on unmount. */
  protected on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    handler: (ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  protected on(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void;
  protected on(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, handler, options);
    this.listeners.push({ target, type, handler, options });
  }

  /** Dispatch a CustomEvent that bubbles out of this component's root. */
  protected emit<D>(name: string, detail: D): void {
    this.root.dispatchEvent(new CustomEvent<D>(name, { detail, bubbles: true }));
  }
}
