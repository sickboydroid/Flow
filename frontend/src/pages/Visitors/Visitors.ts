/**
 * Visitors tab — list of visitor entries with status (in/out/all) and date
 * filters, search, and pagination. Clicking a row opens the
 * VisitorDetailDialog where the user can mark them as left.
 */

import { visitorsApi, type VisitorDateFilter, type VisitorStatusFilter } from '../../api/visitors';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type { VisitorLog } from '../../core/types';
import { FilterGroup } from '../../components/FilterGroup/FilterGroup';
import { Loader } from '../../components/Loader/Loader';
import { Pagination } from '../../components/Pagination/Pagination';
import { SearchInput } from '../../components/SearchInput/SearchInput';
import type { VisitorDetailDialog } from '../../features/VisitorDetailDialog/VisitorDetailDialog';
import { visitorsStore } from '../../store/visitorsStore';
import { initials } from '../../utils/text';
import { formatTime } from '../../utils/time';
import template from './Visitors.html?raw';

export interface VisitorsProps {
  visitorDetailDialog: VisitorDetailDialog;
}

const PAGE_SIZE = 20;

export class Visitors extends Component<VisitorsProps> {
  private listEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private rowTpl!: HTMLTemplateElement;
  private emptyTpl!: HTMLTemplateElement;
  private errorTpl!: HTMLTemplateElement;
  private pagination!: Pagination;
  private unsubStore: (() => void) | null = null;
  private unsubBus: (() => void) | null = null;
  private isActive = false;
  private lastNextCursor: string | null = null;

  protected render(): void {
    this.root.classList.add('flex', 'flex-col', 'bg-white', 'rounded-2xl', 'border', 'border-slate-200', 'shadow-sm', 'overflow-hidden', 'h-full');
    this.root.insertAdjacentHTML('beforeend', template);

    this.listEl = this.$('[data-list]');
    this.loadingEl = this.$('[data-loading]');
    this.rowTpl = this.$<HTMLTemplateElement>('template[data-row]');
    this.emptyTpl = this.$<HTMLTemplateElement>('template[data-empty]');
    this.errorTpl = this.$<HTMLTemplateElement>('template[data-error]');

    const searchSlot = this.$('[data-slot="search"]');
    this.addChild(
      new SearchInput(searchSlot, {
        placeholder: 'Search by name or department...',
        onChange: (v): void => visitorsStore.setSearch(v),
      })
    );

    const statusSlot = this.$('[data-slot="filter-status"]');
    this.addChild(
      new FilterGroup<VisitorStatusFilter>(statusSlot, {
        items: [
          { value: 'in', label: 'Inside', px: 'px-3' },
          { value: 'out', label: 'Left', px: 'px-3' },
          { value: 'all', label: 'All', px: 'px-3' },
        ],
        initialValue: 'in',
        onChange: (v): void => visitorsStore.setStatus(v ?? 'all'),
      })
    );

    const dateSlot = this.$('[data-slot="filter-date"]');
    this.addChild(
      new FilterGroup<'today' | 'yesterday' | 'week' | 'month'>(dateSlot, {
        items: [
          { value: 'today', label: 'Today', px: 'px-3' },
          { value: 'yesterday', label: 'Yest.', px: 'px-3' },
          { value: 'week', label: 'Week', px: 'px-3' },
          { value: 'month', label: 'Month', px: 'px-3' },
        ],
        onChange: (v): void => visitorsStore.setDate((v ?? '') as VisitorDateFilter),
      })
    );

    const pagSlot = this.$('[data-slot="pagination"]');
    this.pagination = this.addChild(
      new Pagination(pagSlot, {
        onPrev: (): void => visitorsStore.pageBack(),
        onNext: (): void => visitorsStore.pageForward(this.lastNextCursor),
      })
    );

    renderIcons(this.root);
  }

  protected bind(): void {
    this.unsubStore = visitorsStore.subscribe(() => {
      if (this.isActive) void this.fetchAndRender();
    });
    this.unsubBus = EventBus.on('logs:changed', ({ domain }) => {
      if (this.isActive && domain === 'visitor') void this.fetchAndRender();
    });
  }

  override unmount(): void {
    this.unsubStore?.();
    this.unsubBus?.();
    super.unmount();
  }

  onEnter(): void {
    this.isActive = true;
    void this.fetchAndRender();
  }

  onLeave(): void {
    this.isActive = false;
  }

  private async fetchAndRender(): Promise<void> {
    Loader.show(this.loadingEl);
    const s = visitorsStore.getState();
    const page = await visitorsApi.list(PAGE_SIZE, s.cursor, s.search, s.status, s.date);
    Loader.hide(this.loadingEl);
    this.lastNextCursor = page.nextCursor;
    this.draw(page.logs);
    this.pagination.update({
      page: s.page,
      totalPages: page.totalPages,
      hasPrev: s.cursorStack.length > 0,
      hasNext: page.nextCursor !== null,
      meta: `${page.logs.length} visitor${page.logs.length === 1 ? '' : 's'}`,
    });
  }

  private draw(logs: VisitorLog[]): void {
    this.listEl.replaceChildren();
    if (logs.length === 0) {
      this.listEl.appendChild(this.emptyTpl.content.cloneNode(true));
      renderIcons(this.listEl);
      return;
    }
    for (const log of logs) this.listEl.appendChild(this.buildRow(log));
  }

  private buildRow(log: VisitorLog): DocumentFragment {
    const frag = this.rowTpl.content.cloneNode(true) as DocumentFragment;
    const row = frag.querySelector<HTMLElement>('.visitor-row')!;

    frag.querySelector<HTMLElement>('[data-initials]')!.textContent = initials(
      log.first_name,
      log.last_name
    );
    frag.querySelector<HTMLElement>('[data-name]')!.textContent =
      `${log.first_name} ${log.last_name}`;

    const dept = frag.querySelector<HTMLElement>('[data-dept]')!;
    if (log.department) {
      dept.textContent = log.department;
      dept.classList.remove('hidden');
    }
    const addr = frag.querySelector<HTMLElement>('[data-address]')!;
    if (log.address) {
      addr.textContent = `· ${log.address}`;
      addr.classList.remove('hidden');
    }

    const state = frag.querySelector<HTMLElement>('[data-state]')!;
    state.textContent = log.has_left ? 'Left' : 'Inside';
    state.classList.add(
      ...(log.has_left ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700').split(
        ' '
      )
    );

    frag.querySelector<HTMLElement>('[data-time-in]')!.textContent =
      `In: ${formatTime(log.time_in ?? log.timestamp)}`;

    row.addEventListener('click', () => this.props.visitorDetailDialog.open(log));
    return frag;
  }

  drawError(): void {
    this.listEl.replaceChildren(this.errorTpl.content.cloneNode(true));
  }
}
