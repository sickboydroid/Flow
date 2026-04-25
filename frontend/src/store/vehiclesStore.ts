/**
 * Pagination + filter + search state for the Vehicles tab.
 */

import { BaseStore } from './BaseStore';

export type VehicleStatusFilter = 'all' | 'IN' | 'OUT';

export interface VehiclesState {
  search: string;
  cursor: string | null;
  cursorStack: (string | null)[];
  page: number;
  status: VehicleStatusFilter;
}

class VehiclesStore extends BaseStore<VehiclesState> {
  setSearch(search: string): void {
    this.resetPaging();
    this.setState({ search });
  }

  setStatus(status: VehicleStatusFilter): void {
    this.resetPaging();
    this.setState({ status });
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

export const vehiclesStore = new VehiclesStore({
  search: '',
  cursor: null,
  cursorStack: [],
  page: 1,
  status: 'all',
});
