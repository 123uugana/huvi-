import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    phoneNumber: text('phone_number').notNull(),
    name: text('name').notNull().default(''),
    role: text('role', { enum: ['FARMER', 'ADMIN'] }).notNull().default('FARMER'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    phoneNumberIdx: uniqueIndex('users_phone_number_idx').on(table.phoneNumber),
  }),
);

export const otpCodes = sqliteTable(
  'otp_codes',
  {
    id: text('id').primaryKey(),
    phoneNumber: text('phone_number').notNull(),
    code: text('code').notNull(),
    expiresAt: text('expires_at').notNull(),
    consumedAt: text('consumed_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    phoneNumberIdx: index('otp_codes_phone_number_idx').on(table.phoneNumber),
  }),
);

export const refreshSessions = sqliteTable(
  'refresh_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    refreshTokenHashIdx: uniqueIndex('refresh_sessions_token_idx').on(
      table.refreshTokenHash,
    ),
    userIdIdx: index('refresh_sessions_user_id_idx').on(table.userId),
  }),
);

export const livestock = sqliteTable(
  'livestock',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    earNumber: text('ear_number').notNull(),
    name: text('name'),
    gender: text('gender', { enum: ['MALE', 'FEMALE', 'UNKNOWN'] })
      .notNull()
      .default('UNKNOWN'),
    birthYear: integer('birth_year'),
    color: text('color'),
    markDescription: text('mark_description'),
    imageUrl: text('image_url'),
    status: text('status', { enum: ['ACTIVE', 'MISSING', 'INACTIVE'] })
      .notNull()
      .default('ACTIVE'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    userEarNumberIdx: uniqueIndex('livestock_user_ear_number_idx').on(
      table.userId,
      table.earNumber,
    ),
    userIdIdx: index('livestock_user_id_idx').on(table.userId),
    statusIdx: index('livestock_status_idx').on(table.status),
  }),
);

export const rfidTags = sqliteTable(
  'rfid_tags',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    livestockId: text('livestock_id')
      .notNull()
      .references(() => livestock.id, { onDelete: 'cascade' }),
    epc: text('epc').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    userEpcIdx: uniqueIndex('rfid_tags_user_epc_idx').on(table.userId, table.epc),
    livestockIdIdx: uniqueIndex('rfid_tags_livestock_id_idx').on(table.livestockId),
  }),
);

export const rfidReaders = sqliteTable('rfid_readers', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const rfidScans = sqliteTable(
  'rfid_scans',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    livestockId: text('livestock_id').references(() => livestock.id, {
      onDelete: 'set null',
    }),
    readerId: text('reader_id').references(() => rfidReaders.id, {
      onDelete: 'set null',
    }),
    epc: text('epc').notNull(),
    direction: text('direction', { enum: ['ENTER', 'EXIT', 'UNKNOWN'] })
      .notNull()
      .default('UNKNOWN'),
    scannedAt: text('scanned_at').notNull(),
  },
  (table) => ({
    livestockIdIdx: index('rfid_scans_livestock_id_idx').on(table.livestockId),
    scannedAtIdx: index('rfid_scans_scanned_at_idx').on(table.scannedAt),
  }),
);

export const devicePushTokens = sqliteTable(
  'device_push_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: text('platform', { enum: ['android', 'ios', 'web'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('device_push_tokens_token_idx').on(table.token),
    userIdIdx: index('device_push_tokens_user_id_idx').on(table.userId),
  }),
);
