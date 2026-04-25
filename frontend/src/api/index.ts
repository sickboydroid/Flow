/**
 * Aggregated, namespaced API surface for ergonomic imports.
 *
 *   import { api } from '@/api';
 *   await api.students.getInfo('...');
 */

import { analyticsApi } from './analytics';
import { metadataApi } from './metadata';
import { recentLogsApi } from './recentLogs';
import { studentsApi } from './students';
import { vehiclesApi } from './vehicles';
import { visitorsApi } from './visitors';

export const api = {
  students: studentsApi,
  vehicles: vehiclesApi,
  visitors: visitorsApi,
  metadata: metadataApi,
  recentLogs: recentLogsApi,
  analytics: analyticsApi,
};

export type Api = typeof api;

export { studentsApi, vehiclesApi, visitorsApi, metadataApi, recentLogsApi, analyticsApi };
