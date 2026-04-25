/**
 * Visitor-domain API endpoints.
 */

import type { CursorPage, VisitorLog } from '../core/types';
import { apiOk, apiRequest, qs } from './http';

export type VisitorStatusFilter = 'in' | 'out' | 'all';
export type VisitorDateFilter = '' | 'today' | 'yesterday' | 'week' | 'month';

export const visitorsApi = {
  async list(
    limit = 20,
    cursor: string | null = null,
    search = '',
    status: VisitorStatusFilter = 'all',
    date: VisitorDateFilter = ''
  ): Promise<CursorPage<VisitorLog>> {
    const data = await apiRequest<CursorPage<VisitorLog>>(
      `/visitor/logs${qs({ limit, cursor, search, status, date })}`
    );
    return data ?? { logs: [], nextCursor: null, totalPages: 1 };
  },

  async addLog(
    firstName: string,
    lastName: string,
    address: string,
    department: string,
    remarks = ''
  ): Promise<boolean> {
    return apiOk('/visitor/log', {
      method: 'POST',
      body: {
        first_name: firstName,
        last_name: lastName,
        address,
        department,
        remarks,
      },
    });
  },

  async markLeft(id: string): Promise<boolean> {
    return apiOk(`/visitor/log/${id}/leave`, { method: 'PUT' });
  },
};
