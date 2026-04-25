/**
 * Student profile dialog: header (photo + identifying info), 4-stat
 * activity summary, and a paged log history table with per-row delete.
 *
 * Loads on every `open(enroll)` call. Pagination uses a cursor stack so
 * the user can step backwards through history pages.
 */

import { studentsApi } from '../../api/students';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type {
  StudentInfo,
  StudentLog,
  StudentStats,
  LogType,
} from '../../core/types';
import { DialogController } from '../../components/Dialog/Dialog';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { appStore } from '../../store/appStore';
import { fallbackAvatarUrl, profilePicUrl } from '../../utils/profilePic';
import {
  formatDuration,
  formatLongDate,
  formatShortDate,
  formatTime,
  timeSince,
} from '../../utils/time';
import template from './StudentInfoDialog.html?raw';

interface FieldDef {
  label: string;
  value: string;
}

interface StatDef {
  label: string;
  value: string;
  className: string;
  sub?: string;
}

const PAGE_SIZE = 10;

export class StudentInfoDialog {
  private controller: DialogController;
  private dialogEl: HTMLDialogElement;
  private contentEl: HTMLElement;

  private skeletonTpl: HTMLTemplateElement;
  private errorTpl: HTMLTemplateElement;
  private bodyTpl: HTMLTemplateElement;
  private fieldTpl: HTMLTemplateElement;
  private statTpl: HTMLTemplateElement;
  private logRowTpl: HTMLTemplateElement;
  private logsEmptyTpl: HTMLTemplateElement;
  private logsLoadingTpl: HTMLTemplateElement;

  private currentEnroll: string | null = null;
  private cursor: string | null = null;
  private cursorStack: (string | null)[] = [];
  private page = 1;

  // References to the body's interactive elements once mounted.
  private logsBodyEl: HTMLTableSectionElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private pageLabel: HTMLElement | null = null;
  private totalLabel: HTMLElement | null = null;

  constructor(host: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = template;
    host.appendChild(wrapper);

    this.dialogEl = wrapper.querySelector<HTMLDialogElement>('[data-dialog]')!;
    this.contentEl = this.dialogEl.querySelector<HTMLElement>('[data-content]')!;

    this.skeletonTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-skeleton]')!;
    this.errorTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-error]')!;
    this.bodyTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-body]')!;
    this.fieldTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-field]')!;
    this.statTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-stat]')!;
    this.logRowTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-log-row]')!;
    this.logsEmptyTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-logs-empty]')!;
    this.logsLoadingTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-logs-loading]')!;

    this.controller = new DialogController(this.dialogEl);
    this.dialogEl.querySelector<HTMLButtonElement>('[data-close]')!
      .addEventListener('click', () => this.controller.close());
    renderIcons(this.dialogEl);
  }

  async open(enroll: string): Promise<void> {
    this.currentEnroll = enroll;
    this.cursor = null;
    this.cursorStack = [];
    this.page = 1;
    this.contentEl.replaceChildren(this.skeletonTpl.content.cloneNode(true));
    this.controller.open();

    const [info, stats] = await Promise.all([
      studentsApi.getInfo(enroll),
      studentsApi.getStats(enroll),
    ]);

    if (!info) {
      this.contentEl.replaceChildren(this.errorTpl.content.cloneNode(true));
      return;
    }
    this.drawBody(info, stats);
    void this.loadPage();
  }

  private drawBody(info: StudentInfo, stats: StudentStats | null): void {
    const frag = this.bodyTpl.content.cloneNode(true) as DocumentFragment;

    const name = `${info.firstName} ${info.lastName}`;
    const photo = frag.querySelector<HTMLImageElement>('[data-photo]')!;
    photo.src = profilePicUrl(info.enrollment);
    photo.addEventListener(
      'error',
      () => {
        photo.onerror = null;
        photo.src = fallbackAvatarUrl(name, 112);
      },
      { once: true }
    );

    frag.querySelector<HTMLElement>('[data-name]')!.textContent = name;
    frag.querySelector<HTMLElement>('[data-enroll]')!.textContent = info.enrollment;

    const fields: FieldDef[] = [
      { label: 'Branch', value: info.branch || '—' },
      { label: 'Year', value: String(info.year ?? '—') },
      { label: 'Gender', value: info.gender || '—' },
      { label: 'Role', value: info.isHosteller ? 'Hosteller' : 'Day Scholar' },
      { label: 'Phone', value: info.phoneNumber || '—' },
      { label: 'Address', value: info.address || '—' },
    ];
    const fieldsHost = frag.querySelector<HTMLElement>('[data-fields]')!;
    for (const f of fields) {
      const node = this.fieldTpl.content.cloneNode(true) as DocumentFragment;
      node.querySelector<HTMLElement>('[data-label]')!.textContent = f.label;
      node.querySelector<HTMLElement>('[data-value]')!.textContent = f.value;
      fieldsHost.appendChild(node);
    }

    const stat = stats ?? {
      totalLogs: 0,
      totalIn: 0,
      totalOut: 0,
      totalLeave: 0,
    };
    const statDefs: StatDef[] = [
      { label: 'Total Logs', value: String(stat.totalLogs), className: 'text-slate-800' },
      {
        label: 'IN',
        value: String(stat.totalIn),
        className: 'text-emerald-600',
        sub: stat.totalInDuration ? formatDuration(stat.totalInDuration) : undefined,
      },
      {
        label: 'OUT',
        value: String(stat.totalOut),
        className: 'text-amber-600',
        sub: stat.totalOutDuration ? formatDuration(stat.totalOutDuration) : undefined,
      },
      {
        label: 'LEAVE',
        value: String(stat.totalLeave),
        className: 'text-blue-600',
        sub: stat.totalLeaveDuration ? formatDuration(stat.totalLeaveDuration) : undefined,
      },
    ];
    const statsHost = frag.querySelector<HTMLElement>('[data-stats]')!;
    for (const s of statDefs) {
      const node = this.statTpl.content.cloneNode(true) as DocumentFragment;
      node.querySelector<HTMLElement>('[data-label]')!.textContent = s.label;
      const v = node.querySelector<HTMLElement>('[data-value]')!;
      v.textContent = s.value;
      v.classList.add(s.className);
      const sub = node.querySelector<HTMLElement>('[data-sub]')!;
      if (s.sub) {
        sub.textContent = s.sub;
        sub.classList.remove('hidden');
      }
      statsHost.appendChild(node);
    }

    this.contentEl.replaceChildren(frag);
    renderIcons(this.contentEl);

    this.logsBodyEl = this.contentEl.querySelector<HTMLTableSectionElement>('[data-logs]');
    this.prevBtn = this.contentEl.querySelector<HTMLButtonElement>('[data-prev]');
    this.nextBtn = this.contentEl.querySelector<HTMLButtonElement>('[data-next]');
    this.pageLabel = this.contentEl.querySelector<HTMLElement>('[data-page]');
    this.totalLabel = this.contentEl.querySelector<HTMLElement>('[data-total]');

    this.prevBtn?.addEventListener('click', () => this.pageBack());
    this.nextBtn?.addEventListener('click', () => this.pageForward());
  }

  private async loadPage(): Promise<void> {
    if (!this.currentEnroll || !this.logsBodyEl) return;
    this.logsBodyEl.replaceChildren(this.logsLoadingTpl.content.cloneNode(true));
    const page = await studentsApi.getLogs(this.currentEnroll, PAGE_SIZE, this.cursor);
    this.drawLogs(page.logs);
    this.updatePagination(page.nextCursor, page.totalPages);
  }

  private drawLogs(logs: StudentLog[]): void {
    if (!this.logsBodyEl) return;
    if (logs.length === 0) {
      this.logsBodyEl.replaceChildren(this.logsEmptyTpl.content.cloneNode(true));
      return;
    }
    this.logsBodyEl.replaceChildren();
    // Logs come back newest-first; the "next" log in time order for any row
    // is the one immediately above it on the page. The very top row only has
    // a known next log when we're still on page 1.
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;
      const newer = i === 0 ? null : logs[i - 1] ?? null;
      const isLatestKnown = i === 0 && this.page === 1;
      this.logsBodyEl.appendChild(this.buildLogRow(log, newer, isLatestKnown));
    }
    renderIcons(this.logsBodyEl);
  }

  private buildLogRow(
    log: StudentLog,
    newer: StudentLog | null,
    isLatestKnown: boolean
  ): DocumentFragment {
    const frag = this.logRowTpl.content.cloneNode(true) as DocumentFragment;
    frag.querySelector<HTMLElement>('[data-date]')!.textContent = formatShortDate(log.timestamp);
    frag.querySelector<HTMLElement>('[data-time]')!.textContent = formatTime(log.timestamp);

    const typeEl = frag.querySelector<HTMLElement>('[data-type]')!;
    typeEl.textContent = log.type;
    typeEl.classList.add(...StatusBadge.studentStatusClasses(log.type as LogType).split(' '));

    frag.querySelector<HTMLElement>('[data-mode]')!.textContent = log.mode_of_entry ?? 'RFID';

    const durationEl = frag.querySelector<HTMLElement>('[data-duration]')!;
    if (newer) {
      const ms = new Date(newer.timestamp).getTime() - new Date(log.timestamp).getTime();
      durationEl.textContent = ms > 0 ? formatDuration(ms) : '—';
    } else if (isLatestKnown) {
      // No newer log exists in the database — this state is still active.
      // Show a live elapsed counter and an "ongoing" caption.
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
      // Top of a non-latest page — the newer log is on a different page,
      // we don't have it loaded so we can't compute the span.
      durationEl.textContent = '—';
    }

    const delBtn = frag.querySelector<HTMLButtonElement>('[data-delete]')!;
    delBtn.addEventListener('click', () => this.deleteLog(log));
    return frag;
  }

  private updatePagination(nextCursor: string | null, totalPages?: number): void {
    if (!this.prevBtn || !this.nextBtn || !this.pageLabel) return;
    this.prevBtn.disabled = this.cursorStack.length === 0;
    this.nextBtn.disabled = nextCursor === null;
    this.pageLabel.textContent = totalPages
      ? `Page ${this.page} of ${totalPages}`
      : `Page ${this.page}`;
    if (this.totalLabel && totalPages) {
      this.totalLabel.textContent = `${totalPages} page${totalPages === 1 ? '' : 's'}`;
    }
    this.pendingNextCursor = nextCursor;
  }

  private pendingNextCursor: string | null = null;

  private async pageForward(): Promise<void> {
    if (this.pendingNextCursor === null) return;
    this.cursorStack.push(this.cursor);
    this.cursor = this.pendingNextCursor;
    this.page += 1;
    await this.loadPage();
  }

  private async pageBack(): Promise<void> {
    if (this.cursorStack.length === 0) return;
    this.cursor = this.cursorStack.pop() ?? null;
    this.page = Math.max(1, this.page - 1);
    await this.loadPage();
  }

  private async deleteLog(log: StudentLog): Promise<void> {
    if (!this.currentEnroll) return;
    const ok = await studentsApi.updateLog(this.currentEnroll, log._id, { deleted: true });
    if (ok) {
      EventBus.emit('snackbar:show', {
        message: `Log from ${formatLongDate(log.timestamp)} deleted`,
        type: 'success',
      });
      // If the deleted log was the one currently displayed in LastScanned,
      // collapse the panel back to its empty state.
      const last = appStore.getState().lastScanned;
      if (last && last.student.enrollment === this.currentEnroll) {
        appStore.clearLastScanned();
      }
      EventBus.emit('logs:changed', { domain: 'student' });
      void this.loadPage();
    } else {
      EventBus.emit('snackbar:show', { message: 'Failed to delete log', type: 'error' });
    }
  }
}
