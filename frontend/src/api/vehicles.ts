/**
 * Vehicle-domain API endpoints.
 */

import type { CursorPage, Direction, VehicleLog } from '../core/types';
import { apiOk, apiRequest, qs } from './http';

export const vehiclesApi = {
  async list(
    limit = 20,
    cursor: string | null = null,
    search = '',
    status: 'all' | Direction = 'all'
  ): Promise<CursorPage<VehicleLog>> {
    const data = await apiRequest<CursorPage<VehicleLog>>(
      `/vehicle/logs${qs({ limit, cursor, search, status })}`
    );
    return data ?? { logs: [], nextCursor: null, totalPages: 1 };
  },

  async getHistory(
    plate: string,
    limit = 50,
    offset = 0
  ): Promise<{ logs: VehicleLog[]; totalCount: number }> {
    const data = await apiRequest<{ logs: VehicleLog[]; totalCount: number }>(
      `/vehicle/history${qs({ plate, limit, offset })}`
    );
    return data ?? { logs: [], totalCount: 0 };
  },

  async addLog(
    plate: string,
    typeOfVehicle: string,
    type: Direction,
    remarks = ''
  ): Promise<boolean> {
    return apiOk('/vehicle/log', {
      method: 'POST',
      body: { plate, type_of_vehicle: typeOfVehicle, type, remarks },
    });
  },
};
