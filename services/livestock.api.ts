import { config } from '@/constants/config';
import {
  mockCreateLivestock,
  mockGetLivestock,
  mockGetLivestockDetail,
  mockGetLivestockScans,
  mockUpdateLivestock,
  mockUploadLivestockImage,
} from '@/mock/livestock';
import type {
  Livestock,
  LivestockInput,
  RfidScan,
} from '@/types/livestock';
import { apiClient } from './api';

type UploadResponse = {
  url: string;
};

function uploadResponse(url: string) {
  return Promise.resolve({
    success: true,
    data: { url },
  });
}

function isLocalImageUri(uri: string) {
  return !uri.startsWith('http://') && !uri.startsWith('https://');
}

export function getLivestock(search?: string) {
  if (config.useMockApi) {
    return mockGetLivestock(search);
  }

  return apiClient.get<Livestock[]>('/api/livestock', {
    query: { search },
  });
}

export function getLivestockDetail(id: string) {
  if (config.useMockApi) {
    return mockGetLivestockDetail(id);
  }

  return apiClient.get<Livestock>(`/api/livestock/${id}`);
}

export function createLivestock(input: LivestockInput) {
  if (config.useMockApi) {
    return mockCreateLivestock(input);
  }

  return apiClient.post<Livestock>('/api/livestock', input);
}

export function updateLivestock(id: string, input: LivestockInput) {
  if (config.useMockApi) {
    return mockUpdateLivestock(id, input);
  }

  return apiClient.patch<Livestock>(`/api/livestock/${id}`, input);
}

export function getLivestockScans(id: string) {
  if (config.useMockApi) {
    return mockGetLivestockScans(id);
  }

  return apiClient.get<RfidScan[]>(`/api/livestock/${id}/scans`);
}

export function uploadLivestockImage(uri: string) {
  if (config.useMockApi) {
    return mockUploadLivestockImage(uri);
  }

  if (!isLocalImageUri(uri)) {
    return uploadResponse(uri);
  }

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: `livestock-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);

  return apiClient.upload<UploadResponse>('/api/uploads', formData);
}
