import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { apiClient, setUnauthorizedHandler } from '@/services/api';
import type { ApiError } from '@/types/api';

const mockGetAccessToken = jest.fn(async (): Promise<string | null> => null);
const mockGetRefreshToken = jest.fn(async (): Promise<string | null> => null);
const mockSaveTokens = jest.fn(
  async (_accessToken: string, _refreshToken: string): Promise<void> => {},
);

jest.mock('@/services/tokenStorage', () => ({
  getAccessToken: () => mockGetAccessToken(),
  getRefreshToken: () => mockGetRefreshToken(),
  saveTokens: (accessToken: string, refreshToken: string) =>
    mockSaveTokens(accessToken, refreshToken),
}));

type MockResponsePayload = Record<string, unknown> | undefined;

function mockResponse(status: number, payload?: MockResponsePayload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn(async () => (payload ? JSON.stringify(payload) : '')),
  } as unknown as Response;
}

function createFetchMock() {
  return jest.fn(
    async (_input?: RequestInfo | URL, _init?: RequestInit) => mockResponse(200),
  );
}

describe('apiClient auth refresh', () => {
  beforeEach(() => {
    mockGetAccessToken.mockResolvedValue('expired-access-token');
    mockGetRefreshToken.mockResolvedValue('refresh-token');
    mockSaveTokens.mockResolvedValue(undefined);
    globalThis.fetch = createFetchMock() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws the refresh error when token refresh fails', async () => {
    const unauthorizedHandler = jest.fn(async () => {});

    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(
        mockResponse(401, {
          message: 'Access token expired.',
        }),
      )
      .mockResolvedValueOnce(
        mockResponse(401, {
          message: 'Refresh token expired.',
        }),
      );

    setUnauthorizedHandler(unauthorizedHandler);

    await expect(apiClient.get('/api/protected')).rejects.toMatchObject({
      status: 401,
      message: 'Refresh token expired.',
    } satisfies Partial<ApiError>);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh request across concurrent 401 responses', async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock.mockImplementation(
      async (input?: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input ?? '');
        const authorization = init?.headers
          ? (init.headers as Record<string, string>).Authorization
          : undefined;

        if (url.endsWith('/api/auth/refresh')) {
          return mockResponse(200, {
            success: true,
            data: {
              accessToken: 'fresh-access-token',
              refreshToken: 'fresh-refresh-token',
            },
          });
        }

        if (authorization === 'Bearer fresh-access-token') {
          return mockResponse(200, {
            success: true,
            data: { ok: true },
          });
        }

        return mockResponse(401, {
          message: 'Access token expired.',
        });
      },
    );

    await expect(
      Promise.all([apiClient.get('/api/a'), apiClient.get('/api/b')]),
    ).resolves.toEqual([
      { success: true, data: { ok: true } },
      { success: true, data: { ok: true } },
    ]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/auth/refresh'),
    );

    expect(refreshCalls).toHaveLength(1);
    expect(mockSaveTokens).toHaveBeenCalledWith(
      'fresh-access-token',
      'fresh-refresh-token',
    );
  });
});
