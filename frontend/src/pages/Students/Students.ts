/**
 * Students tab — searchable, filterable, paged list of students with
 * latest status. Clicking a row opens the StudentInfoDialog.
 *
 * State is owned by `studentsStore`; page subscribes for updates and
 * refetches on `logs:changed` events.
 */

import { studentsApi } from '../../api/students';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type { StudentTableRow, StudentStatus } from '../../core/types';
import { Avatar } from '../../components/Avatar/Avatar';
import { FilterGroup } from '../../components/FilterGroup/FilterGroup';
import { Loader } from '../../components/Loader/Loader';
import { Pagination } from '../../components/Pagination/Pagination';
import { SearchInput } from '../../components/SearchInput/SearchInput';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import type { StudentInfoDialog } from '../../features/StudentInfoDialog/StudentInfoDialog';
import { studentsStore } from '../../store/studentsStore';
import { timeSince } from '../../utils/time';
import template from './Students.html?raw';

export interface StudentsProps {
  studentInfoDialog: StudentInfoDialog;
}

const PAGE_SIZE = 20;

export class Students extends Component<StudentsProps> {
  private tbody!: HTMLTableSectionElement;
  private loadingEl!: HTMLElement;
  private rowTpl!: HTMLTemplateElement;
  private emptyTpl!: HTMLTemplateElement;
  private errorTpl!: HTMLTemplateElement;
  private pagination!: Pagination;
  private unsubStore: (() => void) | null = null;
  private unsubBus: (() => void) | null = null;
  private isActive = false;

  protected render(): void {
    this.root.classList.add('flex', 'flex-col', 'bg-white', 'rounded-2xl', 'border', 'border-slate-200', 'shadow-sm', 'overflow-hidden', 'h-full');
    this.root.insertAdjacentHTML('beforeend', template);

    this.tbody = this.$<HTMLTableSectionElement>('[data-table-body]');
    this.loadingEl = this.$('[data-loading]');
    this.rowTpl = this.$<HTMLTemplateElement>('template[data-row]');
    this.emptyTpl = this.$<HTMLTemplateElement>('template[data-empty]');
    this.errorTpl = this.$<HTMLTemplateElement>('template[data-error]');

    const searchSlot = this.$('[data-slot="search"]');
    this.addChild(
      new SearchInput(searchSlot, {
        placeholder: 'Search by enrollment or name...',
        onChange: (v): void => studentsStore.setSearch(v),
      })
    );

    const rolesSlot = this.$('[data-slot="filter-roles"]');
    this.addChild(
      new FilterGroup(rolesSlot, {
        items: [
          { value: 'hosteller', label: 'Hosteller' },
          { value: 'day_scholar', label: 'Day Scholar' },
        ],
        onChange: (v): void => studentsStore.setFilter('roles', v ? [v] : []),
      })
    );

    const gendersSlot = this.$('[data-slot="filter-genders"]');
    this.addChild(
      new FilterGroup(gendersSlot, {
        items: [
          { value: 'male', label: 'Male', px: 'px-3' },
          { value: 'female', label: 'Female', px: 'px-3' },
        ],
        onChange: (v): void => studentsStore.setFilter('genders', v ? [v] : []),
      })
    );

    const statusesSlot = this.$('[data-slot="filter-statuses"]');
    this.addChild(
      new FilterGroup(statusesSlot, {
        items: [
          { value: 'IN', label: 'IN', px: 'px-3' },
          { value: 'OUT', label: 'OUT', px: 'px-3' },
          { value: 'LEAVE', label: 'LEAVE', px: 'px-3' },
        ],
        onChange: (v): void => studentsStore.setFilter('statuses', v ? [v] : []),
      })
    );

    const pagSlot = this.$('[data-slot="pagination"]');
    this.pagination = this.addChild(
      new Pagination(pagSlot, {
        onPrev: (): void => studentsStore.pageBack(),
        onNext: (): void => studentsStore.pageForward(this.lastNextCursor),
      })
    );

    renderIcons(this.root);
  }

  protected bind(): void {
    this.unsubStore = studentsStore.subscribe(() => {
      if (this.isActive) void this.fetchAndRender();
    });
    this.unsubBus = EventBus.on('logs:changed', ({ domain }) => {
      if (this.isActive && domain === 'student') void this.fetchAndRender();
    });
  }

  override unmount(): void {
    this.unsubStore?.();
    this.unsubBus?.();
    super.unmount();
  }

  /** Called by the router when this page becomes active. */
  onEnter(): void {
    this.isActive = true;
    void this.fetchAndRender();
  }

  onLeave(): void {
    this.isActive = false;
  }

  private lastNextCursor: string | null = null;

  private async fetchAndRender(): Promise<void> {
    Loader.show(this.loadingEl);
    const s = studentsStore.getState();
    const page = await studentsApi.getAllStudentsView(PAGE_SIZE, s.cursor, s.search, s.filters);
    Loader.hide(this.loadingEl);
    this.lastNextCursor = page.nextCursor;
    this.draw(page.logs);
    this.pagination.update({
      page: s.page,
      totalPages: page.totalPages,
      hasPrev: s.cursorStack.length > 0,
      hasNext: page.nextCursor !== null,
      meta: `${page.logs.length} result${page.logs.length === 1 ? '' : 's'}`,
    });
  }

  private draw(rows: StudentTableRow[]): void {
    this.tbody.replaceChildren();
    if (rows.length === 0) {
      this.tbody.appendChild(this.emptyTpl.content.cloneNode(true));
      return;
    }
    for (const row of rows) this.tbody.appendChild(this.buildRow(row));
  }

  private buildRow(row: StudentTableRow): DocumentFragment {
    const frag = this.rowTpl.content.cloneNode(true) as DocumentFragment;
    const tr = frag.querySelector<HTMLElement>('tr')!;

    const photoSlot = frag.querySelector<HTMLElement>('[data-photo]')!.parentElement!;
    photoSlot.replaceChildren();
    new Avatar(photoSlot, {
      enrollment: row.enrollment,
      fallbackName: row.student?.firstName ?? row.enrollment,
    }).mount();

    frag.querySelector<HTMLElement>('[data-enroll]')!.textContent = row.enrollment;
    const name = row.student
      ? `${row.student.firstName} ${row.student.lastName}`.trim()
      : '—';
    frag.querySelector<HTMLElement>('[data-name]')!.textContent = name;
    frag.querySelector<HTMLElement>('[data-gender]')!.textContent = row.student?.gender ?? '—';

    const statusEl = frag.querySelector<HTMLElement>('[data-status]')!;
    const status = row.status as StudentStatus;
    statusEl.textContent = status === 'NO ACTIVITY' ? '—' : status;
    statusEl.classList.add(...StatusBadge.studentStatusClasses(status).split(' '));

    const sinceEl = frag.querySelector<HTMLElement>('[data-since]')!;
    if (row.timestamp) {
      sinceEl.textContent = timeSince(row.timestamp);
      sinceEl.dataset.liveTs = row.timestamp;
      sinceEl.dataset.liveTsSuffix = '';
    } else {
      sinceEl.textContent = '—';
    }

    tr.addEventListener('click', () => this.props.studentInfoDialog.open(row.enrollment));
    return frag;
  }

  drawError(): void {
    this.tbody.replaceChildren(this.errorTpl.content.cloneNode(true));
  }
}
