/**
 * Pagination + filter + search state for the Visitors tab.
 */

import { BaseStore } from './BaseStore';
import type { VisitorDateFilter, VisitorStatusFilter } from '../api/visitors';

export interface VisitorsState {
  search: string;
  cursor: string | null;
  cursorStack: (string | null)[];
  page: number;
  status: VisitorStatusFilter;
  date: VisitorDateFilter;
}

class VisitorsStore extends BaseStore<VisitorsState> {
  setSearch(search: string): void {
    this.resetPaging();
    this.setState({ search });
  }

  setStatus(status: VisitorStatusFilter): void {
    this.resetPaging();
    this.setState({ status });
  }

  setDate(date: VisitorDateFilter): void {
    this.resetPaging();
    this.setState({ date });
  }

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

  resetPaging(): void {
    const s = this.getState();
    if (s.cursor === null && s.cursorStack.length === 0 && s.page === 1) return;
    this.setState({ cursor: null, cursorStack: [], page: 1 });
  }
}

export const visitorsStore = new VisitorsStore({
  search: '',
  cursor: null,
  cursorStack: [],
  page: 1,
  status: 'in',
  date: '',
});
