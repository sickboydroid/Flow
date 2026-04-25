/**
 * Top navigation tab strip. Reflects the current route from the Router
 * and emits user clicks back to it.
 */

import { Component } from '../../core/Component';
import { renderIcons } from '../../core/Icons';
import type { Router } from '../../router/Router';
import template from './NavBar.html?raw';

export interface NavBarProps {
  router: Router;
}

const ACTIVE_CLASSES = ['bg-blue-50', 'text-blue-700', 'active'] as const;
const INACTIVE_CLASS = 'text-slate-600';
const HOVER_CLASS = 'hover:bg-slate-100';

export class NavBar extends Component<NavBarProps> {
  private buttons!: HTMLButtonElement[];

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.buttons = this.$$<HTMLButtonElement>('.nav-tab');
    for (const btn of this.buttons) btn.classList.add(INACTIVE_CLASS, HOVER_CLASS);
    renderIcons(this.root);
  }

  protected bind(): void {
    for (const btn of this.buttons) {
      const tab = btn.dataset.tab;
      if (!tab) continue;
      this.on(btn, 'click', () => this.props.router.navigate(tab));
    }
    this.props.router.onChange((name) => this.setActive(name));
    const current = this.props.router.getCurrent();
    if (current) this.setActive(current);
  }

  private setActive(tab: string): void {
    for (const btn of this.buttons) {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle(INACTIVE_CLASS, !active);
      btn.classList.toggle(HOVER_CLASS, !active);
      for (const c of ACTIVE_CLASSES) btn.classList.toggle(c, active);
    }
  }
}
