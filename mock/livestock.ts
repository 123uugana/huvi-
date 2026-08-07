import type { DashboardSummary } from '@/types/dashboard';
import type { ApiResponse } from '@/types/api';
import type {
  Livestock,
  LivestockInput,
  MissingLivestock,
  RfidScan,
} from '@/types/livestock';

let livestock: Livestock[] = [
  {
    id: 'livestock_1',
    earNumber: 'HH-001',
    name: 'Халзан',
    gender: 'FEMALE',
    birthYear: 2024,
    color: 'Цагаан',
    markDescription: 'Зүүн чих имтэй',
    imageUrl: null,
    status: 'ACTIVE',
    rfidTag: {
      id: 'tag_1',
      epc: 'E280699500001',
    },
    lastScan: {
      scannedAt: '2026-08-07T09:21:00+08:00',
    },
  },
  {
    id: 'livestock_2',
    earNumber: 'HH-012',
    name: 'Бор',
    gender: 'MALE',
    birthYear: 2023,
    color: 'Бор',
    markDescription: 'Баруун чих цуулбартай',
    imageUrl: null,
    status: 'ACTIVE',
    rfidTag: {
      id: 'tag_2',
      epc: 'E280699500012',
    },
    lastScan: {
      scannedAt: '2026-08-07T08:46:00+08:00',
    },
  },
  {
    id: 'livestock_3',
    earNumber: 'HH-015',
    name: 'Сартай',
    gender: 'UNKNOWN',
    birthYear: 2022,
    color: 'Хар цагаан',
    markDescription: 'Духандаа сартай',
    imageUrl: null,
    status: 'MISSING',
    rfidTag: {
      id: 'tag_3',
      epc: 'E280699500015',
    },
    lastScan: {
      scannedAt: '2026-08-06T20:10:00+08:00',
    },
  },
];

let scans: Record<string, RfidScan[]> = {
  livestock_1: [
    {
      id: 'scan_1',
      epc: 'E280699500001',
      direction: 'ENTER',
      scannedAt: '2026-08-07T09:21:00+08:00',
      reader: {
        id: 'reader_1',
        name: 'Үндсэн гарц',
      },
    },
    {
      id: 'scan_3',
      epc: 'E280699500001',
      direction: 'EXIT',
      scannedAt: '2026-08-06T19:12:00+08:00',
      reader: {
        id: 'reader_1',
        name: 'Үндсэн гарц',
      },
    },
  ],
  livestock_2: [
    {
      id: 'scan_2',
      epc: 'E280699500012',
      direction: 'ENTER',
      scannedAt: '2026-08-07T08:46:00+08:00',
      reader: {
        id: 'reader_1',
        name: 'Үндсэн гарц',
      },
    },
  ],
  livestock_3: [
    {
      id: 'scan_4',
      epc: 'E280699500015',
      direction: 'UNKNOWN',
      scannedAt: '2026-08-06T20:10:00+08:00',
      reader: {
        id: 'reader_2',
        name: 'Хойд хашаа',
      },
    },
  ],
};

function wait(ms = 450) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function response<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(item: Livestock, search?: string) {
  const term = normalize(search ?? '');

  if (!term) {
    return true;
  }

  return [
    item.earNumber,
    item.name,
    item.rfidTag?.epc,
    item.color,
  ].some((value) => normalize(value ?? '').includes(term));
}

function createId() {
  return `livestock_${Date.now()}`;
}

function toLivestock(input: LivestockInput, id = createId()): Livestock {
  return {
    id,
    earNumber: input.earNumber,
    name: input.name,
    gender: input.gender,
    birthYear: input.birthYear,
    color: input.color,
    markDescription: input.markDescription,
    imageUrl: input.imageUrl ?? null,
    status: 'ACTIVE',
    rfidTag: input.rfidEpc
      ? {
          id: `tag_${id}`,
          epc: input.rfidEpc,
        }
      : null,
    lastScan: null,
  };
}

export async function mockGetLivestock(search?: string) {
  await wait();

  return response(
    livestock
      .filter((item) => matchesSearch(item, search))
      .sort((first, second) => first.earNumber.localeCompare(second.earNumber)),
  );
}

export async function mockGetLivestockDetail(id: string) {
  await wait();

  const item = livestock.find((entry) => entry.id === id);

  if (!item) {
    throw {
      status: 404,
      message: 'Малын мэдээлэл олдсонгүй.',
      code: 'MOCK_NOT_FOUND',
    };
  }

  return response(item);
}

export async function mockCreateLivestock(input: LivestockInput) {
  await wait();

  const created = toLivestock(input);
  livestock = [created, ...livestock];
  scans = {
    ...scans,
    [created.id]: [],
  };

  return response(created);
}

export async function mockUpdateLivestock(id: string, input: LivestockInput) {
  await wait();

  let updated: Livestock | undefined;
  livestock = livestock.map((item) => {
    if (item.id !== id) {
      return item;
    }

    updated = {
      ...item,
      ...toLivestock(input, id),
      status: item.status,
      lastScan: item.lastScan,
    };

    return updated;
  });

  if (!updated) {
    throw {
      status: 404,
      message: 'Малын мэдээлэл олдсонгүй.',
      code: 'MOCK_NOT_FOUND',
    };
  }

  return response(updated);
}

export async function mockGetLivestockScans(id: string) {
  await wait();
  return response(scans[id] ?? []);
}

export async function mockGetMissingLivestock() {
  await wait();

  const missing: MissingLivestock[] = livestock
    .filter((item) => item.status === 'MISSING')
    .map((item) => ({
      id: item.id,
      earNumber: item.earNumber,
      name: item.name,
      lastSeenAt: item.lastScan?.scannedAt,
    }));

  return response(missing);
}

export async function mockUploadLivestockImage(uri: string) {
  await wait(250);

  return response({
    url: uri,
  });
}

export async function mockGetDashboardFromLivestock() {
  await wait();

  const recentScans = livestock
    .filter((item) => item.lastScan)
    .sort((first, second) => {
      const firstTime = first.lastScan?.scannedAt ?? '';
      const secondTime = second.lastScan?.scannedAt ?? '';

      return secondTime.localeCompare(firstTime);
    })
    .slice(0, 4)
    .map((item, index) => ({
      id: `dashboard_scan_${index}_${item.id}`,
      scannedAt: item.lastScan?.scannedAt ?? '',
      livestock: {
        id: item.id,
        earNumber: item.earNumber,
        name: item.name,
      },
    }));

  const dashboard: DashboardSummary = {
    totalLivestock: livestock.length,
    scannedToday: livestock.filter((item) =>
      item.lastScan?.scannedAt.startsWith('2026-08-07'),
    ).length,
    missingCount: livestock.filter((item) => item.status === 'MISSING').length,
    unknownTagCount: livestock.filter((item) => !item.rfidTag).length,
    recentScans,
  };

  return response(dashboard);
}
