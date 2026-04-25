/**
 * Student-domain API endpoints.
 */

import type {
  CursorPage,
  StudentFilters,
  StudentInfo,
  StudentLog,
  StudentStats,
  StudentStatus,
  StudentTableRow,
  LogType,
} from '../core/types';
import { apiOk, apiRequest, qs } from './http';

export const studentsApi = {
  async isValidRfid(rfid: string): Promise<string | null> {
    const data = await apiRequest<{ enrollment?: string }>(`/student/valid${qs({ rfid })}`);
    return data?.enrollment ?? null;
  },

  async isValidEnroll(enroll: string): Promise<boolean> {
    return apiOk(`/student/valid${qs({ enroll })}`);
  },

  async getInfo(enroll: string): Promise<StudentInfo | null> {
    const data = await apiRequest<{ student?: StudentInfo }>(
      `/student/info${qs({ enroll })}`
    );
    return data?.student ?? null;
  },

  async getStatus(enroll: string): Promise<StudentStatus> {
    const data = await apiRequest<{ status?: StudentStatus }>(
      `/student/status${qs({ enroll })}`
    );
    return data?.status ?? 'IN';
  },

  /** RFID-style update: backend toggles based on previous status. */
  async updateStatus(enroll: string): Promise<boolean> {
    return apiOk(`/student/update/status${qs({ enroll })}`, { method: 'POST' });
  },

  async getLogs(
    enroll: string,
    limit = 50,
    cursor: string | null = null
  ): Promise<CursorPage<StudentLog>> {
    const data = await apiRequest<CursorPage<StudentLog>>(
      `/student/logs${qs({ enroll, limit, cursor })}`
    );
    return data ?? { logs: [], nextCursor: null };
  },

  /** Listing for the Students tab — one row per student with latest status. */
  async getAllStudentsView(
    limit = 20,
    cursor: string | null = null,
    search = '',
    filters?: StudentFilters
  ): Promise<CursorPage<StudentTableRow>> {
    const data = await apiRequest<CursorPage<StudentTableRow>>(
      `/student/all${qs({
        limit,
        cursor,
        search,
        roles: filters?.roles?.join(','),
        genders: filters?.genders?.join(','),
        statuses: filters?.statuses?.join(','),
      })}`
    );
    return data ?? { logs: [], nextCursor: null, totalPages: 1 };
  },

  async getStats(enroll: string): Promise<StudentStats | null> {
    return apiRequest<StudentStats>(`/student/stats${qs({ enroll })}`);
  },

  async addManualLog(enroll: string, type: LogType, remarks = ''): Promise<boolean> {
    return apiOk(`/student/log/manual${qs({ enroll })}`, {
      method: 'POST',
      body: { type, remarks },
    });
  },

  /** Update a single log (currently used for soft-delete). */
  async updateLog(
    enroll: string,
    logId: string,
    updates: Partial<Pick<StudentLog, 'deleted' | 'remarks' | 'type'>>
  ): Promise<boolean> {
    return apiOk(`/student/update/log${qs({ enroll })}`, {
      method: 'PUT',
      body: { log_id: logId, ...updates },
    });
  },
};
