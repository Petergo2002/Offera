# Workspace Notes

Det här repo:t är en `pnpm`-workspace med Offera som huvudprodukt.

## Nuvarande läge

- intern app: React + Vite
- API: Express 5
- auth: Supabase Auth
- databas: PostgreSQL via Drizzle
- mejl: Resend
- evidence/signering: revisionskedja + audit trail + export

## Viktiga kommandon

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run build
```

## Lokal utveckling

Dev-skripten laddar `.env` automatiskt.

Vanlig lokal setup kräver i praktiken:

- `DATABASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `APP_ORIGIN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Se även [README.md](README.md) och [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## Notering

`docs/` är den primära dokumentationsytan. Den här filen ska bara vara en kort repo-orientering, inte en separat källa till arkitektur- eller API-sanning.
