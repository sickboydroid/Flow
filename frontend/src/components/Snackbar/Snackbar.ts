/**
 * Snackbar (toast) host component.
 *
 * Mount once at app boot (`new Snackbar(snackbarContainer).mount()`) and
 * fire toasts via `EventBus.emit('snackbar:show', ...)` from anywhere.
 */

import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type { SnackbarType } from '../../core/types';
import template from './Snackbar.html?raw';

interface TypeStyle {
  bg: string;
  icon: string;
  accent: string;
}

const TYPE_STYLES: Record<SnackbarType, TypeStyle> = {
  success: { bg: 'bg-emerald-600/95 text-white', icon: 'check-circle-2', accent: 'bg-emerald-300' },
  error: { bg: 'bg-rose-600/95 text-white', icon: 'alert-octagon', accent: 'bg-rose-300' },
  info: { bg: 'bg-slate-900/95 text-white', icon: 'info', accent: 'bg-slate-400' },
};

const VISIBLE_MS = 3500;
const EXIT_MS = 220;
const MAX_VISIBLE = 4;
const QUICK_DISMISS_MS = 600;

interface ActiveToast {
  el: HTMLDivElement;
  hideTimer: ReturnType<typeof setTimeout>;
}

export class Snackbar extends Component {
  private toastTpl!: HTMLTemplateElement;
  private unsub: (() => void) | null = null;
  private active: ActiveToast[] = [];

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.toastTpl = this.$<HTMLTemplateElement>('template[data-toast]');
  }

  protected bind(): void {
    this.unsub = EventBus.on('snackbar:show', ({ message, type }) => this.show(message, type));
  }

  override unmount(): void {
    this.unsub?.();
    this.unsub = null;
    for (const t of this.active) clearTimeout(t.hideTimer);
    this.active = [];
    super.unmount();
  }

  show(message: string, type: SnackbarType = 'info'): void {
    const style = TYPE_STYLES[type];
    const fragment = this.toastTpl.content.cloneNode(true) as DocumentFragment;
    const toast = fragment.querySelector<HTMLDivElement>('.snackbar-toast');
    if (!toast) return;

    toast.classList.add(...style.bg.split(' '));
    toast.querySelector<HTMLElement>('[data-accent]')!.classList.add(style.accent);
    toast.querySelector<HTMLElement>('[data-icon]')!.setAttribute('data-lucide', style.icon);
    toast.querySelector<HTMLElement>('[data-message]')!.textContent = message;
    toast.style.setProperty('--snackbar-visible', `${VISIBLE_MS}ms`);
    toast.style.setProperty('--snackbar-exit', `${EXIT_MS}ms`);

    this.root.appendChild(toast);
    renderIcons(toast);

    // Trigger the enter animation on the next frame (CSS handles it).
    requestAnimationFrame(() => toast.classList.add('snackbar-show'));

    const entry: ActiveToast = {
      el: toast,
      hideTimer: setTimeout(() => this.dismiss(entry, EXIT_MS), VISIBLE_MS),
    };
    this.active.push(entry);

    const dismissBtn = toast.querySelector<HTMLButtonElement>('[data-dismiss]');
    dismissBtn?.addEventListener('click', () => this.dismiss(entry, EXIT_MS), { once: true });

    // Cap concurrent toasts: tell anything past the cap to disappear quickly.
    while (this.active.length > MAX_VISIBLE) {
      const oldest = this.active[0];
      if (!oldest) break;
      this.dismiss(oldest, QUICK_DISMISS_MS);
    }
  }

  private dismiss(entry: ActiveToast, fadeMs: number): void {
    const idx = this.active.indexOf(entry);
    if (idx === -1) return;
    this.active.splice(idx, 1);
    clearTimeout(entry.hideTimer);

    // Truncate the running progress bar so it doesn't keep crawling during exit.
    entry.el.classList.add('snackbar-hide');
    entry.el.style.setProperty('--snackbar-exit', `${fadeMs}ms`);
    setTimeout(() => entry.el.remove(), Math.max(50, fadeMs));
  }
}

/** Convenience that emits via the EventBus, callable without a Snackbar reference. */
export function showSnackbar(message: string, type: SnackbarType = 'info'): void {
  EventBus.emit('snackbar:show', { message, type });
}
