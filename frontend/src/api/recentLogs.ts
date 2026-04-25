/**
 * Mixed recent-logs feed used by the dashboard.
 */

import type { RecentLog } from '../core/types';
import { apiRequest, qs } from './http';

export const recentLogsApi = {
  async list(limit = 20): Promise<RecentLog[]> {
    const data = await apiRequest<{ logs?: RecentLog[] }>(`/recent-logs${qs({ limit })}`);
    return data?.logs ?? [];
  },
};
