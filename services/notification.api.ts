import { config } from '@/constants/config';
import { mockRegisterPushToken } from '@/mock/notifications';
import type {
  PushTokenRegistration,
  RegisterPushTokenInput,
} from '@/types/notification';
import { apiClient } from './api';

export function registerPushToken(input: RegisterPushTokenInput) {
  if (config.useMockApi) {
    return mockRegisterPushToken(input);
  }

  return apiClient.post<PushTokenRegistration>(
    '/api/devices/push-token',
    input,
  );
}
