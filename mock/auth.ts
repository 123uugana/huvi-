import type { ApiError, ApiResponse } from '@/types/api';
import type { AuthSession, AuthUser, SendOtpResult } from '@/types/auth';

const MOCK_PHONE_NUMBER = '99112233';
const MOCK_OTP = '123456';

const mockUser: AuthUser = {
  id: 'user_1',
  phoneNumber: MOCK_PHONE_NUMBER,
  name: 'Ууганбаяр',
  role: 'FARMER',
};

function wait(ms = 500) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mockError(message: string, status = 400): ApiError {
  return {
    status,
    message,
    code: 'MOCK_AUTH_ERROR',
  };
}

function response<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export async function mockSendOtp(phoneNumber: string) {
  await wait();

  if (phoneNumber !== MOCK_PHONE_NUMBER) {
    throw mockError('Бүртгэлтэй утасны дугаар олдсонгүй.');
  }

  return response<SendOtpResult>({ phoneNumber });
}

export async function mockVerifyOtp(phoneNumber: string, code: string) {
  await wait();

  if (phoneNumber !== MOCK_PHONE_NUMBER || code !== MOCK_OTP) {
    throw mockError('Баталгаажуулах код буруу байна.');
  }

  return response<AuthSession>({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
    requiresProfileSetup: false,
  });
}

export async function mockGetMe() {
  await wait(250);
  return response<AuthUser>(mockUser);
}
