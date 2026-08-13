import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(process.cwd(), 'drizzle'));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            ACCESS_TOKEN_SECRET: 'test-secret-that-is-not-the-production-secret',
            SMS_PROVIDER: 'log',
            EXPOSE_OTP: 'true',
            OTP_CODE: '123456',
          },
        },
      }),
    ],
    test: {
      include: ['worker/tests/**/*.test.ts'],
      setupFiles: ['./worker/tests/apply-migrations.ts'],
    },
  };
});
