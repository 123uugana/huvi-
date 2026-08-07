import { config } from '@/constants/config';
import type {
  ApiError,
  ApiResponse,
  HttpMethod,
  QueryParams,
} from '@/types/api';
import { getAccessToken } from './tokenStorage';

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  query?: QueryParams;
  skipAuth?: boolean;
};

let unauthorizedHandler: (() => void | Promise<void>) | undefined;
let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(handler: () => void | Promise<void>) {
  unauthorizedHandler = handler;
}

function appendQuery(url: string, query?: QueryParams) {
  if (!query) {
    return url;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  if (!queryString) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

function buildUrl(path: string, query?: QueryParams) {
  const url = path.startsWith('http')
    ? path
    : `${config.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  return appendQuery(url, query);
}

function createApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === 'object') {
    const errorPayload = payload as Partial<ApiError> & { error?: string };

    return {
      status,
      message:
        errorPayload.message ??
        errorPayload.error ??
        'Сервертэй холбогдож чадсангүй.',
      code: errorPayload.code,
      details: errorPayload.details ?? payload,
    };
  }

  return {
    status,
    message: 'Сервертэй холбогдож чадсангүй.',
  };
}

function parseJson(text: string) {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw createApiError(0, {
      message: 'Серверээс буруу өгөгдөл ирлээ.',
      details: text,
    });
  }
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function buildRequestBody(
  body: unknown,
  hasBody: boolean,
  hasFormDataBody: boolean,
): BodyInit | undefined {
  if (!hasBody) {
    return undefined;
  }

  if (hasFormDataBody) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

async function handleUnauthorized() {
  if (!unauthorizedHandler || isHandlingUnauthorized) {
    return;
  }

  isHandlingUnauthorized = true;

  try {
    await unauthorizedHandler();
  } finally {
    isHandlingUnauthorized = false;
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  const hasBody = options.body !== undefined;
  const hasFormDataBody = isFormData(options.body);

  if (hasBody && !hasFormDataBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth) {
    const token = await getAccessToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  const body = buildRequestBody(options.body, hasBody, hasFormDataBody);

  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
    });
  } catch {
    throw createApiError(0, {
      message: 'Сервертэй холбогдож чадсангүй.',
    });
  }

  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    const error = createApiError(response.status, payload);

    if (response.status === 401) {
      await handleUnauthorized();
    }

    throw error;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success?: unknown }).success === false
  ) {
    throw createApiError(response.status, payload);
  }

  return payload as ApiResponse<T>;
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>('GET', path, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>('POST', path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>('PATCH', path, { ...options, body });
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>('DELETE', path, options);
  },
  upload<T>(path: string, formData: FormData, options?: RequestOptions) {
    return request<T>('POST', path, { ...options, body: formData });
  },
};
