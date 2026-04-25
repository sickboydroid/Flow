/**
 * Generic prev/next pagination strip with a page indicator and an optional
 * meta line on the right (e.g. "20 results"). The component is dumb: the
 * parent decides whether each button is enabled and what the meta text says.
 */

import { Component } from '../../core/Component';
import { renderIcons } from '../../core/Icons';
import template from './Pagination.html?raw';

export interface PaginationProps {
  onPrev: () => void;
  onNext: () => void;
}

export interface PaginationState {
  page: number;
  totalPages?: number;
  hasPrev: boolean;
  hasNext: boolean;
  meta?: string;
}

export class Pagination extends Component<PaginationProps> {
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private indicator!: HTMLElement;
  private meta!: HTMLElement;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.prevBtn = this.$<HTMLButtonElement>('[data-prev]');
    this.nextBtn = this.$<HTMLButtonElement>('[data-next]');
    this.indicator = this.$('[data-indicator]');
    this.meta = this.$('[data-meta]');
    renderIcons(this.root);
  }

  protected bind(): void {
    this.on(this.prevBtn, 'click', () => this.props.onPrev());
    this.on(this.nextBtn, 'click', () => this.props.onNext());
  }

  update(state: PaginationState): void {
    this.prevBtn.disabled = !state.hasPrev;
    this.nextBtn.disabled = !state.hasNext;
    this.indicator.textContent =
      state.totalPages && state.totalPages > 1
        ? `Page ${state.page} of ${state.totalPages}`
        : `Page ${state.page}`;
    this.meta.textContent = state.meta ?? '';
  }
}
