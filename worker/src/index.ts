/// <reference types="@cloudflare/workers-types" />

import { and, count, desc, eq, inArray, isNotNull, isNull, like, lt, ne, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import {
  alerts,
  devicePushTokens,
  livestock,
  otpCodes,
  refreshSessions,
  rfidReaders,
  rfidScans,
  rfidTags,
  users,
} from './db/schema';

type Env = {
  DB: D1Database;
  ACCESS_TOKEN_SECRET?: string;
  OTP_CODE?: string;
  EXPOSE_OTP?: string;
  SMS_PROVIDER?: 'log' | 'infobip';
  INFOBIP_BASE_URL?: string;
  INFOBIP_API_KEY?: string;
  INFOBIP_SENDER?: string;
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

const OTP_RESEND_COOLDOWN_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const RECENT_SCANS_LIMIT = 50;

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

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна.'),
});

const updateLivestockStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'MISSING', 'INACTIVE']),
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

const registerReaderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const scanInputSchema = z.object({
  epc: z.string().trim().min(1),
  direction: z.enum(['ENTER', 'EXIT', 'UNKNOWN']).optional(),
  readerId: z.string().trim().optional(),
});

const ingestScansSchema = z.object({
  scans: z.array(scanInputSchema).min(1),
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

function createOtpCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, '0');
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
  const secret = env.ACCESS_TOKEN_SECRET;

  if (!secret || secret === 'replace-this-secret-before-production' || secret.length < 32) {
    throw new ApiFailure(
      500,
      'ACCESS_TOKEN_SECRET тохируулаагүй байна.',
      'ACCESS_TOKEN_SECRET_NOT_CONFIGURED',
    );
  }

  return secret;
}

function smsProvider(env: Env) {
  if (env.SMS_PROVIDER === 'log' || env.SMS_PROVIDER === 'infobip') {
    return env.SMS_PROVIDER;
  }

  throw new ApiFailure(
    500,
    'SMS тохиргоо дутуу байна.',
    'SMS_PROVIDER_NOT_CONFIGURED',
  );
}

async function sendInfobipSms(env: Env, to: string, body: string) {
  const apiKey = env.INFOBIP_API_KEY;
  const baseUrl = env.INFOBIP_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new ApiFailure(
      500,
      'SMS тохиргоо дутуу байна.',
      'SMS_PROVIDER_NOT_CONFIGURED',
    );
  }

  const response = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
    method: 'POST',
    headers: {
      Authorization: `App ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          from: env.INFOBIP_SENDER ?? 'HentsHurga',
          destinations: [{ to }],
          text: body,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Infobip SMS failed', response.status, details);
    throw new ApiFailure(502, 'SMS илгээж чадсангүй.', 'SMS_SEND_FAILED');
  }
}

async function sendOtpSms(env: Env, phoneNumber: string, code: string) {
  const body = `Хэнц Хурга баталгаажуулах код: ${code}. Код 10 минут хүчинтэй.`;

  if (smsProvider(env) === 'infobip') {
    await sendInfobipSms(env, `976${phoneNumber}`, body);
    return;
  }

  console.info(`OTP code for +976${phoneNumber}: ${code}`);
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

function livestockResponse(
  row: typeof livestock.$inferSelect,
  tag?: typeof rfidTags.$inferSelect | null,
  lastScan?: typeof rfidScans.$inferSelect | null,
) {
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

  return livestockResponse(row, tag, lastScan);
}

async function mapLivestockList(
  db: ReturnType<typeof drizzle>,
  rows: (typeof livestock.$inferSelect)[],
) {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [tags, scans] = await Promise.all([
    db.select().from(rfidTags).where(inArray(rfidTags.livestockId, ids)).all(),
    db
      .select()
      .from(rfidScans)
      .where(inArray(rfidScans.livestockId, ids))
      .orderBy(desc(rfidScans.scannedAt))
      .all(),
  ]);

  const tagByLivestockId = new Map(tags.map((tag) => [tag.livestockId, tag]));
  const lastScanByLivestockId = new Map<string, (typeof scans)[number]>();

  for (const scan of scans) {
    if (scan.livestockId && !lastScanByLivestockId.has(scan.livestockId)) {
      lastScanByLivestockId.set(scan.livestockId, scan);
    }
  }

  return rows.map((row) =>
    livestockResponse(
      row,
      tagByLivestockId.get(row.id),
      lastScanByLivestockId.get(row.id),
    ),
  );
}

async function ensureUniqueEarNumber(
  db: ReturnType<typeof drizzle>,
  userId: string,
  earNumber: string,
  excludeLivestockId?: string,
) {
  const existing = await db
    .select()
    .from(livestock)
    .where(
      and(
        eq(livestock.userId, userId),
        eq(livestock.earNumber, earNumber),
        ...(excludeLivestockId ? [ne(livestock.id, excludeLivestockId)] : []),
      ),
    )
    .get();

  if (existing) {
    throw new ApiFailure(409, 'Энэ дугаартай мал бүртгэгдсэн байна.', 'DUPLICATE_EAR_NUMBER');
  }
}

async function ensureUniqueEpc(
  db: ReturnType<typeof drizzle>,
  userId: string,
  epc: string,
  excludeLivestockId?: string,
) {
  const existing = await db
    .select()
    .from(rfidTags)
    .where(
      and(
        eq(rfidTags.userId, userId),
        eq(rfidTags.epc, epc),
        ...(excludeLivestockId ? [ne(rfidTags.livestockId, excludeLivestockId)] : []),
      ),
    )
    .get();

  if (existing) {
    throw new ApiFailure(409, 'Энэ RFID EPC бүртгэгдсэн байна.', 'DUPLICATE_EPC');
  }
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

async function sendAlertPush(
  env: Env,
  db: ReturnType<typeof drizzle>,
  userId: string,
  input: {
    title: string;
    message: string;
    livestockId?: string | null;
  },
) {
  const tokens = await db
    .select({ token: devicePushTokens.token })
    .from(devicePushTokens)
    .where(eq(devicePushTokens.userId, userId))
    .all();

  if (tokens.length === 0) {
    return;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(
      tokens.map(({ token }) => ({
        to: token,
        title: input.title,
        body: input.message,
        sound: 'default',
        ...(input.livestockId ? { data: { livestockId: input.livestockId } } : {}),
      })),
    ),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Expo push send failed', response.status, details);
  }
}

async function createAlert(
  db: ReturnType<typeof drizzle>,
  env: Env,
  ctx: ExecutionContext,
  userId: string,
  input: {
    type: 'MISSING' | 'FOUND' | 'SYSTEM';
    title: string;
    message: string;
    livestockId?: string | null;
  },
) {
  await db.insert(alerts).values({
    id: createId('alert'),
    userId,
    livestockId: input.livestockId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    isRead: false,
    createdAt: now(),
  });

  ctx.waitUntil(
    sendAlertPush(env, db, userId, {
      title: input.title,
      message: input.message,
      livestockId: input.livestockId,
    }),
  );
}

async function handleSendOtp(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, sendOtpSchema);
  const timestamp = now();

  const latestOtp = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phoneNumber, input.phoneNumber), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .get();

  if (latestOtp) {
    const elapsed = Date.now() - new Date(latestOtp.createdAt).getTime();

    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new ApiFailure(
        429,
        `Кодыг дахин илгээхийн тулд ${seconds} секунд хүлээнэ үү.`,
        'OTP_RESEND_TOO_SOON',
      );
    }

    await db
      .update(otpCodes)
      .set({ consumedAt: timestamp })
      .where(eq(otpCodes.phoneNumber, input.phoneNumber));
  }

  await db
    .delete(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneNumber, input.phoneNumber),
        or(isNotNull(otpCodes.consumedAt), lt(otpCodes.expiresAt, timestamp)),
      ),
    );

  const code =
    env.SMS_PROVIDER === 'log' && env.OTP_CODE ? env.OTP_CODE : createOtpCode();

  await db.insert(otpCodes).values({
    id: createId('otp'),
    phoneNumber: input.phoneNumber,
    code,
    expiresAt: minutesFromNow(10),
    attemptCount: 0,
    createdAt: timestamp,
  });

  await sendOtpSms(env, input.phoneNumber, code);

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
    .where(and(eq(otpCodes.phoneNumber, input.phoneNumber), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .get();

  if (!otp || otp.expiresAt < now()) {
    throw new ApiFailure(400, 'Баталгаажуулах код буруу эсвэл хугацаа дууссан байна.');
  }

  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) {
    await db.update(otpCodes).set({ consumedAt: now() }).where(eq(otpCodes.id, otp.id));
    throw new ApiFailure(
      429,
      'Оролдлогын хязгаар давсан тул код хүчингүй боллоо. Дахин код авах шаардлагатай.',
      'OTP_TOO_MANY_ATTEMPTS',
    );
  }

  if (otp.code !== input.code) {
    const attempts = otp.attemptCount + 1;

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await db
        .update(otpCodes)
        .set({ attemptCount: attempts, consumedAt: now() })
        .where(eq(otpCodes.id, otp.id));
      throw new ApiFailure(
        429,
        'Оролдлогын хязгаар давсан тул код хүчингүй боллоо. Дахин код авах шаардлагатай.',
        'OTP_TOO_MANY_ATTEMPTS',
      );
    }

    await db.update(otpCodes).set({ attemptCount: attempts }).where(eq(otpCodes.id, otp.id));
    throw new ApiFailure(400, 'Баталгаажуулах код буруу байна.');
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

  if (!session) {
    const existing = await db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.refreshTokenHash, refreshTokenHash))
      .get();

    if (existing) {
      await db
        .update(refreshSessions)
        .set({ revokedAt: now() })
        .where(eq(refreshSessions.userId, existing.userId));
    }

    throw new ApiFailure(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
  }

  if (session.expiresAt < now()) {
    await db
      .update(refreshSessions)
      .set({ revokedAt: now() })
      .where(eq(refreshSessions.id, session.id));

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

  await db.delete(refreshSessions).where(lt(refreshSessions.expiresAt, now()));

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

async function handleUpdateMe(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const user = await getAuthUser(request, db, env);
  const input = await parseJson(request, updateProfileSchema);

  await db
    .update(users)
    .set({ name: input.name.trim(), updatedAt: now() })
    .where(eq(users.id, user.id));

  return apiResponse({
    id: user.id,
    phoneNumber: user.phoneNumber,
    name: input.name.trim(),
    role: user.role,
  });
}

async function handleListLivestock(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim();
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');
  const paginated = pageParam !== null || limitParam !== null;
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.min(100, Math.max(1, Number(limitParam) || 20));

  const conditions = search
    ? and(
        eq(livestock.userId, userId),
        or(
          like(livestock.earNumber, `%${search}%`),
          like(livestock.name, `%${search}%`),
          like(livestock.color, `%${search}%`),
          like(rfidTags.epc, `%${search}%`),
        ),
      )
    : eq(livestock.userId, userId);

  const totalRow = await db
    .select({ value: count() })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(conditions)
    .get();

  const rows = await db
    .select({ animal: livestock })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(conditions)
    .orderBy(livestock.earNumber)
    .limit(paginated ? limit : 500)
    .offset(paginated ? (page - 1) * limit : 0)
    .all();

  const uniqueRows = [...new Map(rows.map((row) => [row.animal.id, row.animal])).values()];
  const data = await mapLivestockList(db, uniqueRows);

  if (paginated) {
    return apiResponse({
      items: data,
      total: totalRow?.value ?? 0,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((totalRow?.value ?? 0) / limit)),
    });
  }

  return apiResponse(data);
}

async function handleCreateLivestock(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, livestockInputSchema);
  const timestamp = now();
  const livestockId = createId('livestock');
  const earNumber = input.earNumber.trim();
  const epc = cleanOptionalText(input.rfidEpc);

  await ensureUniqueEarNumber(db, userId, earNumber);
  if (epc) {
    await ensureUniqueEpc(db, userId, epc);
  }

  await db.insert(livestock).values({
    id: livestockId,
    userId,
    earNumber,
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
  await upsertRfidTag(db, userId, livestockId, epc);

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

  const earNumber = input.earNumber.trim();
  const epc = cleanOptionalText(input.rfidEpc);

  await ensureUniqueEarNumber(db, userId, earNumber, livestockId);
  if (epc) {
    await ensureUniqueEpc(db, userId, epc, livestockId);
  }

  await db
    .update(livestock)
    .set({
      earNumber,
      name: cleanOptionalText(input.name),
      gender: input.gender,
      birthYear: input.birthYear ?? null,
      color: cleanOptionalText(input.color),
      markDescription: cleanOptionalText(input.markDescription),
      imageUrl: input.imageUrl ?? null,
      updatedAt: now(),
    })
    .where(eq(livestock.id, livestockId));
  await upsertRfidTag(db, userId, livestockId, epc);

  const updated = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, updated!));
}

async function handleUpdateLivestockStatus(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  const input = await parseJson(request, updateLivestockStatusSchema);
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  if (existing.status !== input.status) {
    await db
      .update(livestock)
      .set({ status: input.status, updatedAt: now() })
      .where(eq(livestock.id, livestockId));

    if (input.status === 'MISSING') {
      await createAlert(db, env, ctx, userId, {
        type: 'MISSING',
        title: 'Мал дутуу',
        message: `${existing.earNumber} дугаартай мал дутуу болсон.`,
        livestockId: existing.id,
      });
    } else if (existing.status === 'MISSING' && input.status === 'ACTIVE') {
      await createAlert(db, env, ctx, userId, {
        type: 'FOUND',
        title: 'Мал олдлоо',
        message: `${existing.earNumber} дугаартай мал олдсон.`,
        livestockId: existing.id,
      });
    }
  }

  const updated = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, updated!));
}

async function handleDeleteLivestock(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  await db.delete(rfidTags).where(eq(rfidTags.livestockId, livestockId));
  await db.update(rfidScans).set({ livestockId: null }).where(eq(rfidScans.livestockId, livestockId));
  await db.update(alerts).set({ livestockId: null }).where(eq(alerts.livestockId, livestockId));
  await db.delete(livestock).where(eq(livestock.id, livestockId));

  return apiResponse({ id: livestockId, deleted: true });
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

async function handleRegisterReader(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, registerReaderSchema);
  const timestamp = now();
  const readerId = input.id.trim();
  const readerName = input.name.trim();

  const existing = await db.select().from(rfidReaders).where(eq(rfidReaders.id, readerId)).get();

  if (existing && existing.userId !== userId) {
    throw new ApiFailure(409, 'Энэ уншигч бүртгэгдсэн байна.', 'READER_ALREADY_REGISTERED');
  }

  if (existing) {
    await db
      .update(rfidReaders)
      .set({ name: readerName, updatedAt: timestamp })
      .where(eq(rfidReaders.id, readerId));
  } else {
    await db.insert(rfidReaders).values({
      id: readerId,
      userId,
      name: readerName,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return apiResponse({ id: readerId, name: readerName });
}

async function handleIngestScans(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, ingestScansSchema);
  const lowerEpcs = [...new Set(input.scans.map((scan) => scan.epc.toLowerCase()))];

  const tags = await db
    .select()
    .from(rfidTags)
    .where(and(eq(rfidTags.userId, userId), inArray(sql`lower(${rfidTags.epc})`, lowerEpcs)))
    .all();

  const tagByLowerEpc = new Map(tags.map((tag) => [tag.epc.toLowerCase(), tag]));
  const baseTime = Date.now();
  let known = 0;
  let unknown = 0;
  const unknownEpcs: string[] = [];

  for (let i = 0; i < input.scans.length; i += 1) {
    const scan = input.scans[i];
    const tag = tagByLowerEpc.get(scan.epc.toLowerCase());

    await db.insert(rfidScans).values({
      id: createId('scan'),
      userId,
      livestockId: tag?.livestockId ?? null,
      readerId: scan.readerId || null,
      epc: scan.epc,
      direction: scan.direction ?? 'UNKNOWN',
      scannedAt: new Date(baseTime + i).toISOString(),
    });

    if (tag) {
      known += 1;
    } else {
      unknown += 1;
      if (!unknownEpcs.includes(scan.epc)) {
        unknownEpcs.push(scan.epc);
      }
    }
  }

  return apiResponse({
    accepted: input.scans.length,
    known,
    unknown,
    unknownEpcs,
  });
}

async function handleListScans(db: ReturnType<typeof drizzle>, userId: string) {
  const rows = await db
    .select({
      id: rfidScans.id,
      epc: rfidScans.epc,
      direction: rfidScans.direction,
      scannedAt: rfidScans.scannedAt,
      readerId: rfidScans.readerId,
      livestockId: rfidScans.livestockId,
      earNumber: livestock.earNumber,
      name: livestock.name,
    })
    .from(rfidScans)
    .leftJoin(livestock, eq(livestock.id, rfidScans.livestockId))
    .where(eq(rfidScans.userId, userId))
    .orderBy(desc(rfidScans.scannedAt))
    .limit(RECENT_SCANS_LIMIT)
    .all();

  return apiResponse(
    rows.map((scan) => ({
      id: scan.id,
      epc: scan.epc,
      direction: scan.direction,
      scannedAt: scan.scannedAt,
      reader: scan.readerId ? { id: scan.readerId, name: 'RFID уншигч' } : null,
      livestock: scan.livestockId
        ? {
            id: scan.livestockId,
            earNumber: scan.earNumber,
            name: scan.name ?? undefined,
          }
        : null,
    })),
  );
}

async function handleListAlerts(db: ReturnType<typeof drizzle>, userId: string) {
  const rows = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      title: alerts.title,
      message: alerts.message,
      isRead: alerts.isRead,
      livestockId: alerts.livestockId,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt))
    .limit(50)
    .all();

  return apiResponse(rows);
}

async function handleReadAlert(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  alertId: string,
) {
  const existing = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Мэдэгдэл олдсонгүй.', 'NOT_FOUND');
  }

  await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, alertId));
  return apiResponse({ id: alertId, isRead: true });
}

async function handleReadAllAlerts(db: ReturnType<typeof drizzle>, userId: string) {
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.userId, userId));
  return apiResponse({ updated: true });
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

async function handleAdminStatistics(db: ReturnType<typeof drizzle>) {
  const today = new Date().toISOString().slice(0, 10);
  const totalUsers = await db.select({ value: count() }).from(users).get();
  const totalLivestock = await db.select({ value: count() }).from(livestock).get();
  const missing = await db
    .select({ value: count() })
    .from(livestock)
    .where(eq(livestock.status, 'MISSING'))
    .get();
  const unknownTags = await db
    .select({ value: count() })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(isNull(rfidTags.id))
    .get();
  const scannedToday = await db
    .select({ value: count() })
    .from(rfidScans)
    .where(like(rfidScans.scannedAt, `${today}%`))
    .get();
  const missingLivestock = await db
    .select({
      id: livestock.id,
      earNumber: livestock.earNumber,
      name: livestock.name,
    })
    .from(livestock)
    .where(eq(livestock.status, 'MISSING'))
    .orderBy(livestock.earNumber)
    .all();
  const recentUsers = await db
    .select({
      id: users.id,
      name: users.name,
      phoneNumber: users.phoneNumber,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5)
    .all();

  return apiResponse({
    totalUsers: totalUsers?.value ?? 0,
    totalLivestock: totalLivestock?.value ?? 0,
    scannedToday: scannedToday?.value ?? 0,
    missingCount: missing?.value ?? 0,
    unknownTagCount: unknownTags?.value ?? 0,
    missingLivestock,
    recentUsers,
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
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new ApiFailure(400, 'Зураг олдсонгүй.', 'BAD_REQUEST');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new ApiFailure(400, 'Зөвхөн зураг файл илгээх боломжтой.', 'INVALID_FILE_TYPE');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiFailure(413, 'Зургийн хэмжээ 5MB-с ихгүй байна.', 'FILE_TOO_LARGE');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return apiResponse({
    url: `data:${file.type};base64,${base64FromBytes(bytes)}`,
  });
}

async function route(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const db = drizzle(env.DB);

  if (request.method === 'GET' && path === '/api/health') {
    return apiResponse({ status: 'ok' });
  }

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

  if (request.method === 'PATCH' && path === '/api/auth/me') {
    return handleUpdateMe(request, db, env);
  }

  if (request.method === 'GET' && path === '/api/dashboard') {
    return handleDashboard(db, user.id);
  }

  if (request.method === 'GET' && path === '/api/reports/missing') {
    return handleMissingLivestock(db, user.id);
  }

  if (request.method === 'GET' && path === '/api/admin/statistics') {
    if (user.role !== 'ADMIN') {
      throw new ApiFailure(403, 'Админ эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleAdminStatistics(db);
  }

  if (request.method === 'GET' && path === '/api/alerts') {
    return handleListAlerts(db, user.id);
  }

  if (request.method === 'PATCH' && path === '/api/alerts/read-all') {
    return handleReadAllAlerts(db, user.id);
  }

  if (request.method === 'POST' && path === '/api/devices/push-token') {
    return handlePushToken(request, db, user.id);
  }

  if (request.method === 'POST' && path === '/api/devices/readers') {
    return handleRegisterReader(request, db, user.id);
  }

  if (request.method === 'POST' && path === '/api/scans') {
    return handleIngestScans(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/scans') {
    return handleListScans(db, user.id);
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

  const livestockStatusMatch = path.match(/^\/api\/livestock\/([^/]+)\/status$/);

  if (livestockStatusMatch && request.method === 'PATCH') {
    return handleUpdateLivestockStatus(
      request,
      db,
      user.id,
      livestockStatusMatch[1],
      env,
      ctx,
    );
  }
  
  const alertReadMatch = path.match(/^\/api\/alerts\/([^/]+)\/read$/);

  if (alertReadMatch && request.method === 'PATCH') {
    return handleReadAlert(request, db, user.id, alertReadMatch[1]);
  }

  const livestockMatch = path.match(/^\/api\/livestock\/([^/]+)$/);

  if (livestockMatch) {
    if (request.method === 'GET') {
      return handleGetLivestock(db, user.id, livestockMatch[1]);
    }

    if (request.method === 'PATCH') {
      return handleUpdateLivestock(request, db, user.id, livestockMatch[1]);
    }

    if (request.method === 'DELETE') {
      return handleDeleteLivestock(db, user.id, livestockMatch[1]);
    }
  }

  throw new ApiFailure(404, 'Endpoint олдсонгүй.', 'NOT_FOUND');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      return apiError(error);
    }
  },
};
