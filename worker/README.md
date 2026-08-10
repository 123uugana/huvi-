# Hents Hurga Cloudflare Worker

Cloudflare Worker API backed by D1 and Drizzle ORM.

## Local Runtime Secrets

Create `.dev.vars` from `.dev.vars.example`:

```bash
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
OTP_CODE=123456
EXPOSE_OTP=true
```

For production, set the secret in Cloudflare:

```bash
npx wrangler secret put ACCESS_TOKEN_SECRET
```

Deploying the Worker requires an API token with Workers permissions, for example
`Workers Scripts:Edit`, plus access to this account. The D1-only token is enough
for Drizzle migrations, but not for Worker secrets or deploys.

## Database

Generate migrations:

```bash
npm run db:generate
```

Apply migrations to the remote D1 database:

```bash
npx wrangler d1 migrations apply hents-hurag --remote --config wrangler.toml
```

## Run

```bash
npm run worker:dev
```

Deploy:

```bash
npm run worker:deploy
```
