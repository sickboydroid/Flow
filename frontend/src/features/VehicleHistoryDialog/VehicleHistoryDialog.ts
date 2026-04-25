/**
 * Dialog showing the full history of vehicle entry/exit events for a
 * single plate. Built on top of `DialogController` for shared behavior
 * (close-on-backdrop, scan pause).
 */

import { vehiclesApi } from '../../api/vehicles';
import { renderIcons } from '../../core/Icons';
import type { VehicleLog } from '../../core/types';
import { DialogController } from '../../components/Dialog/Dialog';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { formatDuration, formatShortDate, formatTime, timeSince } from '../../utils/time';
import template from './VehicleHistoryDialog.html?raw';

export class VehicleHistoryDialog {
  private controller: DialogController;
  private dialogEl: HTMLDialogElement;
  private titleEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private contentEl: HTMLElement;
  private loadingTpl: HTMLTemplateElement;
  private emptyTpl: HTMLTemplateElement;
  private tableTpl: HTMLTemplateElement;
  private rowTpl: HTMLTemplateElement;

  constructor(host: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = template;
    host.appendChild(wrapper);

    this.dialogEl = wrapper.querySelector<HTMLDialogElement>('[data-dialog]')!;
    this.titleEl = this.dialogEl.querySelector<HTMLElement>('[data-title]')!;
    this.subtitleEl = this.dialogEl.querySelector<HTMLElement>('[data-subtitle]')!;
    this.contentEl = this.dialogEl.querySelector<HTMLElement>('[data-content]')!;
    this.loadingTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-loading]')!;
    this.emptyTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-empty]')!;
    this.tableTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-table]')!;
    this.rowTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-row]')!;

    this.controller = new DialogController(this.dialogEl);
    this.dialogEl.querySelector<HTMLButtonElement>('[data-close]')!
      .addEventListener('click', () => this.controller.close());
    renderIcons(this.dialogEl);
  }

  async open(plate: string): Promise<void> {
    this.titleEl.textContent = `Vehicle History — ${plate}`;
    this.subtitleEl.textContent = 'Loading…';
    this.contentEl.replaceChildren(this.loadingTpl.content.cloneNode(true));
    this.controller.open();

    const { logs, totalCount } = await vehiclesApi.getHistory(plate, 50, 0);
    this.subtitleEl.textContent = `${totalCount} log${totalCount === 1 ? '' : 's'}`;
    this.draw(logs);
  }

  private draw(logs: VehicleLog[]): void {
    if (logs.length === 0) {
      this.contentEl.replaceChildren(this.emptyTpl.content.cloneNode(true));
      return;
    }
    const tableFrag = this.tableTpl.content.cloneNode(true) as DocumentFragment;
    const rowsHost = tableFrag.querySelector<HTMLElement>('[data-rows]')!;
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;
      const newer = i === 0 ? null : logs[i - 1] ?? null;
      // Vehicle history is a single page (limit 50, no pagination), so the
      // top row really is the latest known event for this plate.
      rowsHost.appendChild(this.buildRow(log, newer, i === 0));
    }
    this.contentEl.replaceChildren(tableFrag);
  }

  private buildRow(
    log: VehicleLog,
    newer: VehicleLog | null,
    isLatestKnown: boolean
  ): DocumentFragment {
    const frag = this.rowTpl.content.cloneNode(true) as DocumentFragment;
    frag.querySelector<HTMLElement>('[data-date]')!.textContent = formatShortDate(log.timestamp);
    frag.querySelector<HTMLElement>('[data-time]')!.textContent = formatTime(log.timestamp);
    frag.querySelector<HTMLElement>('[data-vehicle-type]')!.textContent = log.type_of_vehicle;
    const dir = frag.querySelector<HTMLElement>('[data-direction]')!;
    dir.textContent = log.type;
    dir.classList.add(...StatusBadge.directionClasses(log.type).split(' '));

    const durationEl = frag.querySelector<HTMLElement>('[data-duration]')!;
    if (newer) {
      const ms = new Date(newer.timestamp).getTime() - new Date(log.timestamp).getTime();
      durationEl.textContent = ms > 0 ? formatDuration(ms) : '—';
    } else if (isLatestKnown) {
      durationEl.replaceChildren();
      durationEl.classList.add('text-emerald-600', 'font-semibold');
      const live = document.createElement('span');
      live.dataset.liveTs = log.timestamp;
      live.dataset.liveTsSuffix = '';
      live.textContent = timeSince(log.timestamp);
      const tag = document.createElement('span');
      tag.className = 'ml-1 text-[10px] uppercase tracking-wider text-emerald-500/70';
      tag.textContent = 'ongoing';
      durationEl.appendChild(live);
      durationEl.appendChild(tag);
    } else {
      durationEl.textContent = '—';
    }

    frag.querySelector<HTMLElement>('[data-remarks]')!.textContent = log.remarks ?? '—';
    return frag;
  }
}
