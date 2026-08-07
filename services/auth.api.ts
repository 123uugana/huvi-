import { apiClient } from './api';
import { config } from '@/constants/config';
import {
  mockGetMe,
  mockSendOtp,
  mockVerifyOtp,
} from '@/mock/auth';
import type { AuthSession, AuthUser, SendOtpResult } from '@/types/auth';

export function sendOtp(phoneNumber: string) {
  if (config.useMockApi) {
    return mockSendOtp(phoneNumber);
  }

  return apiClient.post<SendOtpResult>(
    '/api/auth/send-otp',
    { phoneNumber },
    { skipAuth: true },
  );
}

export function verifyOtp(phoneNumber: string, code: string) {
  if (config.useMockApi) {
    return mockVerifyOtp(phoneNumber, code);
  }

  return apiClient.post<AuthSession>(
    '/api/auth/verify-otp',
    { phoneNumber, code },
    { skipAuth: true },
  );
}

export function getMe() {
  if (config.useMockApi) {
    return mockGetMe();
  }

  return apiClient.get<AuthUser>('/api/auth/me');
}
