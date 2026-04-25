/**
 * Analytics API.
 */

import type { AnalyticsResponse } from '../core/types';
import { apiRequest } from './http';

export const analyticsApi = {
  async get(): Promise<AnalyticsResponse | null> {
    return apiRequest<AnalyticsResponse>('/analytics');
  },
};
