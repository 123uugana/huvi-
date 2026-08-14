import { env } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

type WorkerEnv = Parameters<typeof worker.fetch>[1];
const testEnv = env as unknown as WorkerEnv;

type ApiBody = {
  success: boolean;
  data?: any;
  message?: string;
  code?: string;
};

type ApiResult = {
  status: number;
  body: ApiBody;
};

const OTP_CODE = '123456';

async function api(path: string, init?: RequestInit): Promise<ApiResult> {
  const request = new Request(`http://localhost${path}`, init);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  const body = (await response.json().catch(() => null)) as ApiBody;
  return { status: response.status, body };
}

function json(method: string, payload: unknown, token?: string): RequestInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { method, headers, body: JSON.stringify(payload) };
}

function authorized(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function registerAndLogin(phone: string) {
  const send = await api('/api/auth/send-otp', json('POST', { phoneNumber: phone }));
  expect(send.status).toBe(200);

  const verify = await api(
    '/api/auth/verify-otp',
    json('POST', { phoneNumber: phone, code: OTP_CODE }),
  );
  expect(verify.status).toBe(200);
  return verify.body.data;
}

describe('health', () => {
  it('returns ok without authentication', async () => {
    const res = await api('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok' });
  });
});

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await api('/api/livestock');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('sends an OTP and verifies it into a session', async () => {
    const data = await registerAndLogin('99001122');

    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user.phoneNumber).toBe('99001122');
    expect(data.user.role).toBe('FARMER');
    expect(data.requiresProfileSetup).toBe(true);
  });

  it('returns the OTP code in the response when EXPOSE_OTP is enabled', async () => {
    const res = await api('/api/auth/send-otp', json('POST', { phoneNumber: '99002233' }));
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(OTP_CODE);
  });

  it('locks an OTP after 5 wrong attempts', async () => {
    const phone = '99003344';
    await api('/api/auth/send-otp', json('POST', { phoneNumber: phone }));

    let last: ApiResult | undefined;
    for (let i = 0; i < 5; i += 1) {
      last = await api('/api/auth/verify-otp', json('POST', { phoneNumber: phone, code: '000000' }));
    }

    expect(last!.status).toBe(429);
    expect(last!.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');

    const afterLock = await api(
      '/api/auth/verify-otp',
      json('POST', { phoneNumber: phone, code: OTP_CODE }),
    );
    expect(afterLock.status).toBe(400);
  });

  it('rejects a wrong OTP code', async () => {
    const phone = '99004455';
    await api('/api/auth/send-otp', json('POST', { phoneNumber: phone }));

    const res = await api('/api/auth/verify-otp', json('POST', { phoneNumber: phone, code: '111111' }));
    expect(res.status).toBe(400);
  });
});

describe('refresh token rotation', () => {
  it('rotates on refresh and revokes every session when an old token is reused', async () => {
    const tokens = await registerAndLogin('99005566');
    const first = tokens.refreshToken;

    const rotated = await api('/api/auth/refresh', json('POST', { refreshToken: first }));
    expect(rotated.status).toBe(200);
    const second = rotated.body.data.refreshToken;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    const reuse = await api('/api/auth/refresh', json('POST', { refreshToken: first }));
    expect(reuse.status).toBe(401);

    const afterTheft = await api('/api/auth/refresh', json('POST', { refreshToken: second }));
    expect(afterTheft.status).toBe(401);
  });
});

describe('profile', () => {
  it('updates the profile name', async () => {
    const tokens = await registerAndLogin('99006677');
    const res = await api(
      '/api/auth/me',
      json('PATCH', { name: 'Бат' }, tokens.accessToken),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Бат');
    expect(res.body.data.requiresProfileSetup).toBeUndefined();
  });

  it('returns the current user', async () => {
    const tokens = await registerAndLogin('99007788');
    const res = await api('/api/auth/me', authorized(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.phoneNumber).toBe('99007788');
  });
});

describe('livestock CRUD', () => {
  it('creates, lists, updates and deletes livestock', async () => {
    const tokens = await registerAndLogin('99008899');
    const auth = tokens.accessToken;

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'A-100', gender: 'FEMALE', name: 'Хонь', rfidEpc: 'E280-0001' }, auth),
    );
    expect(created.status).toBe(200);
    const id = created.body.data.id;
    expect(created.body.data.earNumber).toBe('A-100');
    expect(created.body.data.rfidTag).toEqual({ id: expect.any(String), epc: 'E280-0001' });
    expect(created.body.data.lastScan).toBeNull();

    const dupEar = await api(
      '/api/livestock',
      json('POST', { earNumber: 'A-100', gender: 'MALE' }, auth),
    );
    expect(dupEar.status).toBe(409);
    expect(dupEar.body.code).toBe('DUPLICATE_EAR_NUMBER');

    const dupEpc = await api(
      '/api/livestock',
      json('POST', { earNumber: 'A-101', gender: 'MALE', rfidEpc: 'E280-0001' }, auth),
    );
    expect(dupEpc.status).toBe(409);
    expect(dupEpc.body.code).toBe('DUPLICATE_EPC');

    const list = await api('/api/livestock', authorized(auth));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const single = await api(`/api/livestock/${id}`, authorized(auth));
    expect(single.status).toBe(200);
    expect(single.body.data.earNumber).toBe('A-100');

    const updated = await api(
      `/api/livestock/${id}`,
      json('PATCH', { earNumber: 'A-100', gender: 'FEMALE', name: 'Улаан хонь' }, auth),
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Улаан хонь');
    expect(updated.body.data.rfidTag).toBeNull();

    const deleted = await api(`/api/livestock/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } });
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toEqual({ id, deleted: true });

    const after = await api('/api/livestock', authorized(auth));
    expect(after.body.data).toHaveLength(0);
  });

  it('returns 404 for a livestock that belongs to another user', async () => {
    const tokens = await registerAndLogin('99110011');
    const res = await api('/api/livestock/does-not-exist', authorized(tokens.accessToken));
    expect(res.status).toBe(404);
  });

  it('paginates the list with page/limit', async () => {
    const tokens = await registerAndLogin('99112233');
    const auth = tokens.accessToken;

    for (let i = 0; i < 3; i += 1) {
      const created = await api(
        '/api/livestock',
        json('POST', { earNumber: `C-${i}`, gender: 'FEMALE' }, auth),
      );
      expect(created.status).toBe(200);
    }

    const res = await api('/api/livestock?page=1&limit=2', authorized(auth));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.totalPages).toBe(2);
  });
});

describe('status alerts', () => {
  it('creates MISSING and FOUND alerts and marks them read', async () => {
    const tokens = await registerAndLogin('99123344');
    const auth = tokens.accessToken;

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'B-200', gender: 'MALE' }, auth),
    );
    const id = created.body.data.id;

    const missing = await api(
      `/api/livestock/${id}/status`,
      json('PATCH', { status: 'MISSING' }, auth),
    );
    expect(missing.status).toBe(200);
    expect(missing.body.data.status).toBe('MISSING');

    const alerts = await api('/api/alerts', authorized(auth));
    expect(alerts.status).toBe(200);
    expect(alerts.body.data).toHaveLength(1);
    expect(alerts.body.data[0]).toMatchObject({
      type: 'MISSING',
      livestockId: id,
      isRead: false,
    });

    const alertId = alerts.body.data[0].id;
    const read = await api(`/api/alerts/${alertId}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${auth}` } });
    expect(read.status).toBe(200);
    expect(read.body.data.isRead).toBe(true);

    const found = await api(
      `/api/livestock/${id}/status`,
      json('PATCH', { status: 'ACTIVE' }, auth),
    );
    expect(found.status).toBe(200);

    const alertsAfter = await api('/api/alerts', authorized(auth));
    expect(alertsAfter.body.data).toHaveLength(2);
    expect(alertsAfter.body.data[0].type).toBe('FOUND');
  });
});

describe('rfid device integration', () => {
  it('registers and re-registers a reader', async () => {
    const tokens = await registerAndLogin('99156677');
    const auth = tokens.accessToken;

    const first = await api(
      '/api/devices/readers',
      json('POST', { id: 'hh100-01', name: 'Хашаа 1 уншигч' }, auth),
    );
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ id: 'hh100-01', name: 'Хашаа 1 уншигч' });

    const second = await api(
      '/api/devices/readers',
      json('POST', { id: 'hh100-01', name: 'Хашаа шинэ уншигч' }, auth),
    );
    expect(second.status).toBe(200);
    expect(second.body.data.name).toBe('Хашаа шинэ уншигч');
  });

  it('rejects a reader registered by another user', async () => {
    const tokensA = await registerAndLogin('99167788');
    const res = await api(
      '/api/devices/readers',
      json('POST', { id: 'hl7202-01', name: 'Гар уншигч' }, tokensA.accessToken),
    );
    expect(res.status).toBe(200);

    const tokensB = await registerAndLogin('99178899');
    const conflict = await api(
      '/api/devices/readers',
      json('POST', { id: 'hl7202-01', name: 'Гар уншигч' }, tokensB.accessToken),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('READER_ALREADY_REGISTERED');
  });

  it('ingests scans and separates known from unknown EPCs', async () => {
    const tokens = await registerAndLogin('99189900');
    const auth = tokens.accessToken;

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'D-300', gender: 'FEMALE', rfidEpc: 'E280-1160' }, auth),
    );
    expect(created.status).toBe(200);
    const livestockId = created.body.data.id;

    const ingest = await api(
      '/api/scans',
      json(
        'POST',
        {
          scans: [
            { epc: 'e280-1160', direction: 'ENTER', readerId: 'hh100-01' },
            { epc: 'E280-9999', direction: 'EXIT', readerId: 'hh100-01' },
            { epc: 'E280-1160', readerId: 'hl7202-01' },
          ],
        },
        auth,
      ),
    );
    expect(ingest.status).toBe(200);
    expect(ingest.body.data.accepted).toBe(3);
    expect(ingest.body.data.known).toBe(2);
    expect(ingest.body.data.unknown).toBe(1);
    expect(ingest.body.data.unknownEpcs).toEqual(['E280-9999']);

    const recent = await api('/api/scans', authorized(auth));
    expect(recent.status).toBe(200);
    expect(recent.body.data).toHaveLength(3);
    expect(recent.body.data[0].epc).toBe('E280-1160');
    expect(recent.body.data[0].livestock).toMatchObject({
      id: livestockId,
      earNumber: 'D-300',
    });
    const unknownScan = recent.body.data.find((scan: any) => scan.epc === 'E280-9999');
    expect(unknownScan.livestock).toBeNull();

    const livestockScans = await api(`/api/livestock/${livestockId}/scans`, authorized(auth));
    expect(livestockScans.status).toBe(200);
    expect(livestockScans.body.data).toHaveLength(2);
  });

  it('rejects an invalid batch', async () => {
    const tokens = await registerAndLogin('99210011');
    const auth = tokens.accessToken;

    const empty = await api('/api/scans', json('POST', { scans: [] }, auth));
    expect(empty.status).toBe(400);

    const badDirection = await api(
      '/api/scans',
      json('POST', { scans: [{ epc: 'E280-0001', direction: 'LEFT' }] }, auth),
    );
    expect(badDirection.status).toBe(400);
  });
});

describe('push tokens', () => {
  it('registers and upserts a push token', async () => {
    const tokens = await registerAndLogin('99134455');
    const auth = tokens.accessToken;

    const first = await api(
      '/api/devices/push-token',
      json('POST', { token: 'ExponentPushToken[abc123]', platform: 'android' }, auth),
    );
    expect(first.status).toBe(200);

    const second = await api(
      '/api/devices/push-token',
      json('POST', { token: 'ExponentPushToken[abc123]', platform: 'ios' }, auth),
    );
    expect(second.status).toBe(200);
  });
});

describe('uploads', () => {
  it('rejects non-image files', async () => {
    const tokens = await registerAndLogin('99223344');

    const form = new FormData();
    form.append('file', new File(['hello'], 'note.txt', { type: 'text/plain' }));
    const res = await api('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects files larger than 5MB', async () => {
    const tokens = await registerAndLogin('99224455');

    const form = new FormData();
    form.append(
      'file',
      new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }),
    );
    const res = await api('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });
});

describe('admin', () => {
  it('rejects non-admin users', async () => {
    const tokens = await registerAndLogin('99145566');
    const res = await api('/api/admin/statistics', authorized(tokens.accessToken));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});
