/**
 * Vehicles tab — list of vehicle entry/exit logs with status filter, search,
 * and pagination. Clicking a row opens the VehicleHistoryDialog for the plate.
 */

import { vehiclesApi } from '../../api/vehicles';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type { VehicleLog } from '../../core/types';
import { FilterGroup } from '../../components/FilterGroup/FilterGroup';
import { Loader } from '../../components/Loader/Loader';
import { Pagination } from '../../components/Pagination/Pagination';
import { SearchInput } from '../../components/SearchInput/SearchInput';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import type { VehicleHistoryDialog } from '../../features/VehicleHistoryDialog/VehicleHistoryDialog';
import { vehiclesStore } from '../../store/vehiclesStore';
import { formatShortDate, formatTime } from '../../utils/time';
import template from './Vehicles.html?raw';

export interface VehiclesProps {
  vehicleHistoryDialog: VehicleHistoryDialog;
}

const PAGE_SIZE = 20;

export class Vehicles extends Component<VehiclesProps> {
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
        placeholder: 'Search by plate or vehicle type...',
        onChange: (v): void => vehiclesStore.setSearch(v),
      })
    );

    const statusSlot = this.$('[data-slot="filter-status"]');
    this.addChild(
      new FilterGroup<'all' | 'IN' | 'OUT'>(statusSlot, {
        items: [
          { value: 'all', label: 'All', px: 'px-3' },
          { value: 'IN', label: 'IN', px: 'px-3' },
          { value: 'OUT', label: 'OUT', px: 'px-3' },
        ],
        initialValue: 'all',
        onChange: (v): void => vehiclesStore.setStatus(v ?? 'all'),
      })
    );

    const pagSlot = this.$('[data-slot="pagination"]');
    this.pagination = this.addChild(
      new Pagination(pagSlot, {
        onPrev: (): void => vehiclesStore.pageBack(),
        onNext: (): void => vehiclesStore.pageForward(this.lastNextCursor),
      })
    );

    renderIcons(this.root);
  }

  protected bind(): void {
    this.unsubStore = vehiclesStore.subscribe(() => {
      if (this.isActive) void this.fetchAndRender();
    });
    this.unsubBus = EventBus.on('logs:changed', ({ domain }) => {
      if (this.isActive && domain === 'vehicle') void this.fetchAndRender();
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
    const s = vehiclesStore.getState();
    const page = await vehiclesApi.list(PAGE_SIZE, s.cursor, s.search, s.status);
    Loader.hide(this.loadingEl);
    this.lastNextCursor = page.nextCursor;
    this.draw(page.logs);
    this.pagination.update({
      page: s.page,
      totalPages: page.totalPages,
      hasPrev: s.cursorStack.length > 0,
      hasNext: page.nextCursor !== null,
      meta: `${page.logs.length} log${page.logs.length === 1 ? '' : 's'}`,
    });
  }

  private draw(logs: VehicleLog[]): void {
    this.listEl.replaceChildren();
    if (logs.length === 0) {
      this.listEl.appendChild(this.emptyTpl.content.cloneNode(true));
      renderIcons(this.listEl);
      return;
    }
    for (const log of logs) this.listEl.appendChild(this.buildRow(log));
    renderIcons(this.listEl);
  }

  private buildRow(log: VehicleLog): DocumentFragment {
    const frag = this.rowTpl.content.cloneNode(true) as DocumentFragment;
    const row = frag.querySelector<HTMLElement>('.vehicle-row')!;

    frag.querySelector<HTMLElement>('[data-plate]')!.textContent = log.plate;
    const dir = frag.querySelector<HTMLElement>('[data-direction]')!;
    dir.textContent = log.type;
    dir.classList.add(...StatusBadge.directionClasses(log.type).split(' '));
    frag.querySelector<HTMLElement>('[data-vehicle-type]')!.textContent = log.type_of_vehicle;

    const remarksEl = frag.querySelector<HTMLElement>('[data-remarks]')!;
    if (log.remarks) {
      remarksEl.textContent = `“${log.remarks}”`;
      remarksEl.classList.remove('hidden');
    }

    frag.querySelector<HTMLElement>('[data-date]')!.textContent = formatShortDate(log.timestamp);
    frag.querySelector<HTMLElement>('[data-time]')!.textContent = formatTime(log.timestamp);

    row.addEventListener('click', () => this.props.vehicleHistoryDialog.open(log.plate));
    return frag;
  }

  drawError(): void {
    this.listEl.replaceChildren(this.errorTpl.content.cloneNode(true));
  }
}
