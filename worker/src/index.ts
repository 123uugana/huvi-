/// <reference types="@cloudflare/workers-types" />

import { and, count, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import {
  devicePushTokens,
  livestock,
  otpCodes,
  refreshSessions,
  rfidScans,
  rfidTags,
  users,
} from './db/schema';

type Env = {
  DB: D1Database;
  ACCESS_TOKEN_SECRET?: string;
  OTP_CODE?: string;
  EXPOSE_OTP?: string;
};

type AuthUser = {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'FARMER' | 'ADMIN';
};

type TokenPayload = {
  sub: string;
  exp: number;
};

const jsonHeaders = {
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const sendOtpSchema = z.object({
  phoneNumber: z.string().regex(/^\d{8}$/),
});

const verifyOtpSchema = sendOtpSchema.extend({
  code: z.string().regex(/^\d{6}$/),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const livestockInputSchema = z.object({
  earNumber: z.string().trim().min(1),
  name: z.string().trim().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthYear: z.number().int().optional(),
  color: z.string().trim().optional(),
  markDescription: z.string().trim().optional(),
  rfidEpc: z.string().trim().optional(),
  imageUrl: z.string().nullable().optional(),
});

const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
});

class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function now() {
  return new Date().toISOString();
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function apiResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify({ success: true, data }), {
    ...init,
    headers: jsonHeaders,
  });
}

function apiError(error: unknown) {
  if (error instanceof ApiFailure) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        code: error.code,
      }),
      { status: error.status, headers: jsonHeaders },
    );
  }

  console.error(error);
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Сервертэй холбогдож чадсангүй.',
      code: 'INTERNAL_ERROR',
    }),
    { status: 500, headers: jsonHeaders },
  );
}

async function parseJson<T>(request: Request, schema: z.ZodType<T>) {
  const payload = await request.json().catch(() => undefined);
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiFailure(400, 'Илгээсэн өгөгдөл буруу байна.', 'BAD_REQUEST');
  }

  return result.data;
}

function base64UrlFromBytes(bytes: Uint8Array) {
  return base64FromBytes(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64FromBytes(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64UrlFromString(value: string) {
  return base64UrlFromBytes(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return base64UrlFromBytes(new Uint8Array(signature));
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return base64UrlFromBytes(new Uint8Array(hash));
}

function accessTokenSecret(env: Env) {
  return env.ACCESS_TOKEN_SECRET ?? 'replace-this-secret-before-production';
}

async function createAccessToken(env: Env, userId: string) {
  const header = base64UrlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlFromString(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    }),
  );
  const signature = await hmac(accessTokenSecret(env), `${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

async function verifyAccessToken(env: Env, token: string): Promise<TokenPayload> {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    throw new ApiFailure(401, 'Нэвтрэх эрх буруу байна.', 'INVALID_TOKEN');
  }

  const expectedSignature = await hmac(accessTokenSecret(env), `${header}.${payload}`);

  if (signature !== expectedSignature) {
    throw new ApiFailure(401, 'Нэвтрэх эрх буруу байна.', 'INVALID_TOKEN');
  }

  const tokenPayload = JSON.parse(decodeBase64Url(payload)) as TokenPayload;

  if (tokenPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new ApiFailure(401, 'Нэвтрэх эрхийн хугацаа дууссан байна.', 'TOKEN_EXPIRED');
  }

  return tokenPayload;
}

async function createSession(db: ReturnType<typeof drizzle>, env: Env, userId: string) {
  const refreshToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const accessToken = await createAccessToken(env, userId);
  const refreshTokenHash = await sha256(refreshToken);
  const createdAt = now();

  await db.insert(refreshSessions).values({
    id: createId('session'),
    userId,
    refreshTokenHash,
    expiresAt: daysFromNow(30),
    createdAt,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function getAuthUser(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!token) {
    throw new ApiFailure(401, 'Нэвтрэх шаардлагатай.', 'UNAUTHORIZED');
  }

  const payload = await verifyAccessToken(env, token);
  const user = await db.select().from(users).where(eq(users.id, payload.sub)).get();

  if (!user) {
    throw new ApiFailure(401, 'Нэвтрэх эрх буруу байна.', 'INVALID_TOKEN');
  }

  return user as AuthUser;
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function mapLivestock(db: ReturnType<typeof drizzle>, row: typeof livestock.$inferSelect) {
  const tag = await db
    .select()
    .from(rfidTags)
    .where(eq(rfidTags.livestockId, row.id))
    .get();
  const lastScan = await db
    .select()
    .from(rfidScans)
    .where(eq(rfidScans.livestockId, row.id))
    .orderBy(desc(rfidScans.scannedAt))
    .limit(1)
    .get();

  return {
    id: row.id,
    earNumber: row.earNumber,
    name: row.name ?? undefined,
    gender: row.gender,
    birthYear: row.birthYear ?? undefined,
    color: row.color ?? undefined,
    markDescription: row.markDescription ?? undefined,
    imageUrl: row.imageUrl,
    status: row.status,
    rfidTag: tag
      ? {
          id: tag.id,
          epc: tag.epc,
        }
      : null,
    lastScan: lastScan
      ? {
          scannedAt: lastScan.scannedAt,
        }
      : null,
  };
}

async function upsertRfidTag(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
  epc?: string | null,
) {
  await db.delete(rfidTags).where(eq(rfidTags.livestockId, livestockId));

  if (!epc) {
    return;
  }

  const timestamp = now();
  await db.insert(rfidTags).values({
    id: createId('tag'),
    userId,
    livestockId,
    epc,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function handleSendOtp(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, sendOtpSchema);
  const timestamp = now();
  const code = env.OTP_CODE ?? '123456';

  await db.insert(otpCodes).values({
    id: createId('otp'),
    phoneNumber: input.phoneNumber,
    code,
    expiresAt: minutesFromNow(10),
    createdAt: timestamp,
  });

  return apiResponse({
    phoneNumber: input.phoneNumber,
    ...(env.EXPOSE_OTP === 'true' ? { code } : {}),
  });
}

async function handleVerifyOtp(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, verifyOtpSchema);
  const otp = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneNumber, input.phoneNumber),
        eq(otpCodes.code, input.code),
        isNull(otpCodes.consumedAt),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .get();

  if (!otp || otp.expiresAt < now()) {
    throw new ApiFailure(400, 'Баталгаажуулах код буруу эсвэл хугацаа дууссан байна.');
  }

  await db.update(otpCodes).set({ consumedAt: now() }).where(eq(otpCodes.id, otp.id));

  let user = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, input.phoneNumber))
    .get();

  if (!user) {
    const timestamp = now();
    user = {
      id: createId('user'),
      phoneNumber: input.phoneNumber,
      name: '',
      role: 'FARMER' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(users).values(user);
  }

  const tokens = await createSession(db, env, user.id);

  return apiResponse({
    ...tokens,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      role: user.role,
    },
    requiresProfileSetup: user.name.trim().length === 0,
  });
}

async function handleRefresh(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, refreshSchema);
  const refreshTokenHash = await sha256(input.refreshToken);
  const session = await db
    .select()
    .from(refreshSessions)
    .where(
      and(
        eq(refreshSessions.refreshTokenHash, refreshTokenHash),
        isNull(refreshSessions.revokedAt),
      ),
    )
    .get();

  if (!session || session.expiresAt < now()) {
    throw new ApiFailure(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await db.select().from(users).where(eq(users.id, session.userId)).get();

  if (!user) {
    throw new ApiFailure(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
  }

  await db
    .update(refreshSessions)
    .set({ revokedAt: now() })
    .where(eq(refreshSessions.id, session.id));

  return apiResponse(await createSession(db, env, user.id));
}

async function handleGetMe(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const user = await getAuthUser(request, db, env);
  return apiResponse({
    id: user.id,
    phoneNumber: user.phoneNumber,
    name: user.name,
    role: user.role,
  });
}

async function handleListLivestock(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim();
  const rows = await db
    .select({ animal: livestock })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(
      search
        ? and(
            eq(livestock.userId, userId),
            or(
              like(livestock.earNumber, `%${search}%`),
              like(livestock.name, `%${search}%`),
              like(livestock.color, `%${search}%`),
              like(rfidTags.epc, `%${search}%`),
            ),
          )
        : eq(livestock.userId, userId),
    )
    .orderBy(livestock.earNumber)
    .all();

  const uniqueRows = [...new Map(rows.map((row) => [row.animal.id, row.animal])).values()];
  return apiResponse(await Promise.all(uniqueRows.map((row) => mapLivestock(db, row))));
}

async function handleCreateLivestock(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, livestockInputSchema);
  const timestamp = now();
  const livestockId = createId('livestock');

  await db.insert(livestock).values({
    id: livestockId,
    userId,
    earNumber: input.earNumber.trim(),
    name: cleanOptionalText(input.name),
    gender: input.gender,
    birthYear: input.birthYear ?? null,
    color: cleanOptionalText(input.color),
    markDescription: cleanOptionalText(input.markDescription),
    imageUrl: input.imageUrl ?? null,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await upsertRfidTag(db, userId, livestockId, cleanOptionalText(input.rfidEpc));

  const created = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, created!));
}

async function handleGetLivestock(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const row = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!row) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  return apiResponse(await mapLivestock(db, row));
}

async function handleUpdateLivestock(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const input = await parseJson(request, livestockInputSchema);
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  await db
    .update(livestock)
    .set({
      earNumber: input.earNumber.trim(),
      name: cleanOptionalText(input.name),
      gender: input.gender,
      birthYear: input.birthYear ?? null,
      color: cleanOptionalText(input.color),
      markDescription: cleanOptionalText(input.markDescription),
      imageUrl: input.imageUrl ?? null,
      updatedAt: now(),
    })
    .where(eq(livestock.id, livestockId));
  await upsertRfidTag(db, userId, livestockId, cleanOptionalText(input.rfidEpc));

  const updated = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, updated!));
}

async function handleLivestockScans(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const rows = await db
    .select()
    .from(rfidScans)
    .where(and(eq(rfidScans.userId, userId), eq(rfidScans.livestockId, livestockId)))
    .orderBy(desc(rfidScans.scannedAt))
    .all();

  return apiResponse(
    rows.map((scan) => ({
      id: scan.id,
      epc: scan.epc,
      direction: scan.direction,
      scannedAt: scan.scannedAt,
      reader: {
        id: scan.readerId ?? 'unknown',
        name: 'RFID уншигч',
      },
    })),
  );
}

async function handleMissingLivestock(db: ReturnType<typeof drizzle>, userId: string) {
  const rows = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.userId, userId), eq(livestock.status, 'MISSING')))
    .orderBy(livestock.earNumber)
    .all();

  const data = await Promise.all(
    rows.map(async (row) => {
      const lastScan = await db
        .select()
        .from(rfidScans)
        .where(eq(rfidScans.livestockId, row.id))
        .orderBy(desc(rfidScans.scannedAt))
        .limit(1)
        .get();

      return {
        id: row.id,
        earNumber: row.earNumber,
        name: row.name ?? undefined,
        lastSeenAt: lastScan?.scannedAt,
      };
    }),
  );

  return apiResponse(data);
}

async function handleDashboard(db: ReturnType<typeof drizzle>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const total = await db
    .select({ value: count() })
    .from(livestock)
    .where(eq(livestock.userId, userId))
    .get();
  const missing = await db
    .select({ value: count() })
    .from(livestock)
    .where(and(eq(livestock.userId, userId), eq(livestock.status, 'MISSING')))
    .get();
  const unknownTags = await db
    .select({ value: count() })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(and(eq(livestock.userId, userId), isNull(rfidTags.id)))
    .get();
  const scannedToday = await db
    .select({ value: count() })
    .from(rfidScans)
    .where(and(eq(rfidScans.userId, userId), like(rfidScans.scannedAt, `${today}%`)))
    .get();
  const recentScans = await db
    .select({
      id: rfidScans.id,
      scannedAt: rfidScans.scannedAt,
      livestockId: livestock.id,
      earNumber: livestock.earNumber,
      name: livestock.name,
    })
    .from(rfidScans)
    .innerJoin(livestock, eq(livestock.id, rfidScans.livestockId))
    .where(eq(rfidScans.userId, userId))
    .orderBy(desc(rfidScans.scannedAt))
    .limit(4)
    .all();

  return apiResponse({
    totalLivestock: total?.value ?? 0,
    scannedToday: scannedToday?.value ?? 0,
    missingCount: missing?.value ?? 0,
    unknownTagCount: unknownTags?.value ?? 0,
    recentScans: recentScans.map((scan) => ({
      id: scan.id,
      scannedAt: scan.scannedAt,
      livestock: {
        id: scan.livestockId,
        earNumber: scan.earNumber,
        name: scan.name ?? undefined,
      },
    })),
  });
}

async function handlePushToken(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const input = await parseJson(request, pushTokenSchema);
  const timestamp = now();

  await db
    .insert(devicePushTokens)
    .values({
      id: createId('device'),
      userId,
      token: input.token,
      platform: input.platform,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: devicePushTokens.token,
      set: {
        userId,
        platform: input.platform,
        updatedAt: timestamp,
      },
    });

  return apiResponse({ token: input.token });
}

async function handleUpload(request: Request) {
  const formData = await request.formData();
  const file = (
    formData as unknown as { get(name: string): FormDataEntryValue | null }
  ).get('file');

  if (!(file instanceof File)) {
    throw new ApiFailure(400, 'Зураг олдсонгүй.', 'BAD_REQUEST');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return apiResponse({
    url: `data:${file.type || 'image/jpeg'};base64,${base64FromBytes(bytes)}`,
  });
}

async function route(request: Request, env: Env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const db = drizzle(env.DB);

  if (request.method === 'POST' && path === '/api/auth/send-otp') {
    return handleSendOtp(request, db, env);
  }

  if (request.method === 'POST' && path === '/api/auth/verify-otp') {
    return handleVerifyOtp(request, db, env);
  }

  if (request.method === 'POST' && path === '/api/auth/refresh') {
    return handleRefresh(request, db, env);
  }

  const user = await getAuthUser(request, db, env);

  if (request.method === 'GET' && path === '/api/auth/me') {
    return handleGetMe(request, db, env);
  }

  if (request.method === 'GET' && path === '/api/dashboard') {
    return handleDashboard(db, user.id);
  }

  if (request.method === 'GET' && path === '/api/reports/missing') {
    return handleMissingLivestock(db, user.id);
  }

  if (request.method === 'POST' && path === '/api/devices/push-token') {
    return handlePushToken(request, db, user.id);
  }

  if (request.method === 'POST' && path === '/api/uploads') {
    return handleUpload(request);
  }

  if (path === '/api/livestock') {
    if (request.method === 'GET') {
      return handleListLivestock(request, db, user.id);
    }

    if (request.method === 'POST') {
      return handleCreateLivestock(request, db, user.id);
    }
  }

  const livestockScansMatch = path.match(/^\/api\/livestock\/([^/]+)\/scans$/);

  if (livestockScansMatch && request.method === 'GET') {
    return handleLivestockScans(db, user.id, livestockScansMatch[1]);
  }

  const livestockMatch = path.match(/^\/api\/livestock\/([^/]+)$/);

  if (livestockMatch) {
    if (request.method === 'GET') {
      return handleGetLivestock(db, user.id, livestockMatch[1]);
    }

    if (request.method === 'PATCH') {
      return handleUpdateLivestock(request, db, user.id, livestockMatch[1]);
    }
  }

  throw new ApiFailure(404, 'Endpoint олдсонгүй.', 'NOT_FOUND');
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await route(request, env);
    } catch (error) {
      return apiError(error);
    }
  },
};
