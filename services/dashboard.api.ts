import { config } from '@/constants/config';
import { mockGetDashboard } from '@/mock/dashboard';
import type { DashboardSummary } from '@/types/dashboard';
import { apiClient } from './api';

export function getDashboard() {
  if (config.useMockApi) {
    return mockGetDashboard();
  }

  return apiClient.get<DashboardSummary>('/api/dashboard');
}
