/**
 * Renders the mixed recent-logs list (student / vehicle / visitor) on the
 * dashboard. Owns the fetch, drawing, and click delegation; the parent
 * passes callbacks for each row variant's click handler.
 *
 * Refetches automatically when the EventBus reports `logs:changed` so the
 * list stays live across cross-tab actions.
 */

import { Component } from '../../core/Component';
import { renderIcons } from '../../core/Icons';
import { EventBus } from '../../core/EventBus';
import { recentLogsApi } from '../../api/recentLogs';
import type { RecentLog, StudentStatus } from '../../core/types';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { liveTimestampTicker } from '../../utils/LiveTimestampTicker';
import { fallbackAvatarUrl, profilePicUrl } from '../../utils/profilePic';
import { initials } from '../../utils/text';
import { formatRelativeWindow, timeSince } from '../../utils/time';
import template from './RecentLogsList.html?raw';

export interface RecentLogsListProps {
  subtitleEl: HTMLElement;
  onStudentClick: (enrollment: string) => void;
  onVehicleClick: (plate: string) => void;
  onVisitorClick: (visitor: Extract<RecentLog, { logType: 'visitor' }>) => void;
}

const PAGE_SIZE = 20;

export class RecentLogsList extends Component<RecentLogsListProps> {
  private rowsHost!: HTMLElement;
  private emptyTpl!: HTMLTemplateElement;
  private errorTpl!: HTMLTemplateElement;
  private studentTpl!: HTMLTemplateElement;
  private vehicleTpl!: HTMLTemplateElement;
  private visitorTpl!: HTMLTemplateElement;
  private logs: RecentLog[] = [];
  private unsubBus: (() => void) | null = null;
  private unsubTick: (() => void) | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.rowsHost = this.$('[data-rows]');
    this.emptyTpl = this.$<HTMLTemplateElement>('template[data-empty]');
    this.errorTpl = this.$<HTMLTemplateElement>('template[data-error]');
    this.studentTpl = this.$<HTMLTemplateElement>('template[data-row-student]');
    this.vehicleTpl = this.$<HTMLTemplateElement>('template[data-row-vehicle]');
    this.visitorTpl = this.$<HTMLTemplateElement>('template[data-row-visitor]');
  }

  protected bind(): void {
    this.unsubBus = EventBus.on('logs:changed', () => this.refresh());
    // Keep the "X entries in the last <span>" subtitle counting up live.
    this.unsubTick = liveTimestampTicker.onTick(() => this.refreshSubtitle());
  }

  override unmount(): void {
    this.unsubBus?.();
    this.unsubTick?.();
    super.unmount();
  }

  private refreshSubtitle(): void {
    if (this.logs.length === 0) return;
    this.props.subtitleEl.textContent = this.buildSubtitle();
  }

  /** Fetch from the backend and re-draw. */
  async refresh(): Promise<void> {
    try {
      this.logs = await recentLogsApi.list(PAGE_SIZE);
      this.draw();
    } catch (e) {
      console.error('[RecentLogsList] fetch failed', e);
      this.drawError();
    }
  }

  /** Returns the latest student log known to this list, if any. */
  latestStudentLog(): Extract<RecentLog, { logType: 'student' }> | null {
    for (const l of this.logs) if (l.logType === 'student') return l;
    return null;
  }

  /** Find a student log by enrollment (used by the scanner debounce). */
  findStudent(enrollment: string): Extract<RecentLog, { logType: 'student' }> | null {
    for (const l of this.logs)
      if (l.logType === 'student' && l.enrollment === enrollment) return l;
    return null;
  }

  /** Apply a ripple highlight to the row of the freshly-scanned student. */
  highlightStudent(enrollment: string): void {
    const row = this.rowsHost.querySelector<HTMLElement>(`[data-row-id="student:${enrollment}"]`);
    if (!row) return;
    row.classList.add('ripple-highlight');
    setTimeout(() => row.classList.remove('ripple-highlight'), 2000);
  }

  private draw(): void {
    const sub = this.props.subtitleEl;
    if (this.logs.length === 0) {
      sub.classList.add('hidden');
      this.rowsHost.replaceChildren(this.emptyTpl.content.cloneNode(true));
      renderIcons(this.rowsHost);
      return;
    }
    sub.textContent = this.buildSubtitle();
    sub.classList.remove('hidden');

    this.rowsHost.replaceChildren();
    for (const log of this.logs) this.rowsHost.appendChild(this.buildRow(log));
    renderIcons(this.rowsHost);
  }

  /**
   * Returns "N entries in the last <span>" using the oldest log on screen
   * to derive the span. Falls back to a plain count for invalid timestamps.
   */
  private buildSubtitle(): string {
    const count = this.logs.length;
    const noun = `entr${count === 1 ? 'y' : 'ies'}`;
    const oldest = this.logs[this.logs.length - 1]?.timestamp;
    if (!oldest) return `${count} recent ${noun}`;
    const ms = Date.now() - new Date(oldest).getTime();
    if (!Number.isFinite(ms) || ms < 0) return `${count} recent ${noun}`;
    return `${count} ${noun} in the last ${formatRelativeWindow(ms)}`;
  }

  private drawError(): void {
    this.rowsHost.replaceChildren(this.errorTpl.content.cloneNode(true));
  }

  private buildRow(log: RecentLog): DocumentFragment {
    if (log.logType === 'student') return this.buildStudentRow(log);
    if (log.logType === 'vehicle') return this.buildVehicleRow(log);
    return this.buildVisitorRow(log);
  }

  private buildStudentRow(log: Extract<RecentLog, { logType: 'student' }>): DocumentFragment {
    const frag = this.studentTpl.content.cloneNode(true) as DocumentFragment;
    const row = frag.querySelector<HTMLElement>('.log-row')!;
    row.dataset.rowId = `student:${log.enrollment}`;

    const studentName = log.student ? `${log.student.firstName} ${log.student.lastName}` : 'Unknown';
    const role = log.student?.isHosteller ? 'Hosteller' : 'Day Scholar';
    const gender = log.student?.gender ?? '';
    const status: StudentStatus = (log.status ?? log.type) as StudentStatus;

    const photo = frag.querySelector<HTMLImageElement>('[data-photo]')!;
    photo.src = profilePicUrl(log.enrollment);
    photo.addEventListener(
      'error',
      () => {
        photo.onerror = null;
        photo.src = fallbackAvatarUrl(studentName);
      },
      { once: true }
    );

    frag.querySelector<HTMLElement>('[data-name]')!.textContent = studentName;
    const statusEl = frag.querySelector<HTMLElement>('[data-status]')!;
    statusEl.textContent = status === 'NO ACTIVITY' ? '—' : status;
    statusEl.classList.add(...StatusBadge.studentStatusClasses(status).split(' '));
    frag.querySelector<HTMLElement>('[data-enroll]')!.textContent = log.enrollment;

    const genderEl = frag.querySelector<HTMLElement>('[data-gender]')!;
    if (gender) {
      genderEl.textContent = gender;
      genderEl.classList.remove('hidden');
    }
    frag.querySelector<HTMLElement>('[data-role]')!.textContent = role;

    const since = frag.querySelector<HTMLElement>('[data-since]')!;
    since.textContent = `${timeSince(log.timestamp)} ago`;
    since.dataset.liveTs = log.timestamp;

    row.addEventListener('click', () => this.props.onStudentClick(log.enrollment));
    return frag;
  }

  private buildVehicleRow(log: Extract<RecentLog, { logType: 'vehicle' }>): DocumentFragment {
    const frag = this.vehicleTpl.content.cloneNode(true) as DocumentFragment;
    const row = frag.querySelector<HTMLElement>('.log-row')!;
    row.dataset.rowId = `vehicle:${log.plate}`;

    frag.querySelector<HTMLElement>('[data-plate]')!.textContent = log.plate;
    const dir = frag.querySelector<HTMLElement>('[data-direction]')!;
    dir.textContent = log.type;
    dir.classList.add(...StatusBadge.directionClasses(log.type).split(' '));
    frag.querySelector<HTMLElement>('[data-vehicle-type]')!.textContent = log.type_of_vehicle;

    const since = frag.querySelector<HTMLElement>('[data-since]')!;
    since.textContent = `${timeSince(log.timestamp)} ago`;
    since.dataset.liveTs = log.timestamp;

    row.addEventListener('click', () => this.props.onVehicleClick(log.plate));
    return frag;
  }

  private buildVisitorRow(log: Extract<RecentLog, { logType: 'visitor' }>): DocumentFragment {
    const frag = this.visitorTpl.content.cloneNode(true) as DocumentFragment;
    const row = frag.querySelector<HTMLElement>('.log-row')!;
    row.dataset.rowId = `visitor:${log._id}`;

    frag.querySelector<HTMLElement>('[data-initials]')!.textContent = initials(
      log.first_name,
      log.last_name
    );
    frag.querySelector<HTMLElement>('[data-name]')!.textContent =
      `${log.first_name} ${log.last_name}`;

    const state = frag.querySelector<HTMLElement>('[data-state]')!;
    state.textContent = log.has_left ? 'Left' : 'Inside';
    state.classList.add(
      ...(log.has_left ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700').split(
        ' '
      )
    );

    frag.querySelector<HTMLElement>('[data-dept]')!.textContent = log.department || 'Visitor';

    const since = frag.querySelector<HTMLElement>('[data-since]')!;
    since.textContent = `${timeSince(log.timestamp)} ago`;
    since.dataset.liveTs = log.timestamp;

    row.addEventListener('click', () => this.props.onVisitorClick(log));
    return frag;
  }
}
