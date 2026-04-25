/**
 * Pagination + filter + search state for the Students tab.
 *
 * The cursor stack records previously visited cursors so the user can
 * page backwards as well as forwards (the backend gives forward cursors
 * only).
 */

import { BaseStore } from './BaseStore';
import type { StudentFilters } from '../core/types';

export interface StudentsState {
  search: string;
  cursor: string | null;
  cursorStack: (string | null)[];
  page: number;
  filters: StudentFilters;
}

class StudentsStore extends BaseStore<StudentsState> {
  setSearch(search: string): void {
    this.resetPaging();
    this.setState({ search });
  }

  setFilter<K extends keyof StudentFilters>(key: K, values: StudentFilters[K]): void {
    this.resetPaging();
    this.setState({ filters: { ...this.getState().filters, [key]: values } });
  }

  /** Push the current cursor and advance to the next page. */
  pageForward(nextCursor: string | null): void {
    const s = this.getState();
    this.setState({
      cursorStack: [...s.cursorStack, s.cursor],
      cursor: nextCursor,
      page: s.page + 1,
    });
  }

  pageBack(): void {
    const s = this.getState();
    if (s.cursorStack.length === 0) return;
    const stack = [...s.cursorStack];
    const prev = stack.pop() ?? null;
    this.setState({ cursor: prev, cursorStack: stack, page: Math.max(1, s.page - 1) });
  }

  /** Reset paging on search / filter changes — invariant: page 1, no cursor. */
  resetPaging(): void {
    const s = this.getState();
    if (s.cursor === null && s.cursorStack.length === 0 && s.page === 1) return;
    this.setState({ cursor: null, cursorStack: [], page: 1 });
  }
}

export const studentsStore = new StudentsStore({
  search: '',
  cursor: null,
  cursorStack: [],
  page: 1,
  filters: { roles: [], genders: [], statuses: [] },
});
