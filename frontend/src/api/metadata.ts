/**
 * Metadata / hints API. Backend keeps a small set of frequent values per
 * type and returns them ordered by usage frequency.
 */

import type { HintType } from '../core/types';
import { apiRequest, qs } from './http';

export const metadataApi = {
  async getHints(type: HintType, limit = 5): Promise<string[]> {
    const data = await apiRequest<{ hints?: string[] }>(`/hints${qs({ type, limit })}`);
    return data?.hints ?? [];
  },
};
