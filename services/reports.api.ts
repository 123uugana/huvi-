import { config } from '@/constants/config';
import { mockGetMissingLivestock } from '@/mock/livestock';
import type { MissingLivestock } from '@/types/livestock';
import { apiClient } from './api';

export function getMissingLivestock() {
  if (config.useMockApi) {
    return mockGetMissingLivestock();
  }

  return apiClient.get<MissingLivestock[]>('/api/reports/missing');
}
