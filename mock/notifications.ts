import type { ApiResponse } from '@/types/api';
import type {
  PushTokenRegistration,
  RegisterPushTokenInput,
} from '@/types/notification';

function wait(ms = 250) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function mockRegisterPushToken(
  input: RegisterPushTokenInput,
): Promise<ApiResponse<PushTokenRegistration>> {
  await wait();

  return {
    success: true,
    data: {
      token: input.token,
    },
  };
}
