const DEFAULT_API_URL = 'http://192.168.1.100:3000';

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
  useMockApi: readBoolean(process.env.EXPO_PUBLIC_USE_MOCK_API, true),
} as const;
