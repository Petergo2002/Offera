# Docs Index

Det här är den underhållna dokumentationen för Offera. Fokus ligger på current state, inte historiska implementeringsplaner.

## Översikt

- [ARCHITECTURE.md](ARCHITECTURE.md)
  Beskriver systemets huvuddelar, auth-/public-gränser, signeringsflöde och runtime-lägen.

- [API.md](API.md)
  Sammanfattar interna och publika API-endpoints, auth-krav, PDF-export och signeringsflöden.

- [CODEBASE.md](CODEBASE.md)
  Mappar repo-strukturen och pekar ut de viktigaste katalogerna och filerna.

- [COMPONENTS.md](COMPONENTS.md)
  Beskriver huvudsidor, providers, quick view/bevis och centrala UI-komponenter.

- [DATA_MODELS.md](DATA_MODELS.md)
  Förklarar dokumentmodellen, kärntabellerna, tokenlivscykeln och evidence-kedjan.

- [ENVIRONMENT.md](ENVIRONMENT.md)
  Referens för `.env`, frontend-/backendvariabler och lokala setup-exempel.

- [INTEGRATIONS.md](INTEGRATIONS.md)
  Beskriver Supabase, Resend, Playwright, Drizzle, OpenAPI/Orval och andra externa/interna integrationer.

- [DOCUMENT_RETENTION_POLICY.md](DOCUMENT_RETENTION_POLICY.md)
  Policy för bevarande, export och hantering av signerade dokument och evidence data.

## Dokument som medvetet inte finns kvar

- gamla `PLAN-*`-filer
- utdaterade prototypnoteringar som inte längre matchade produkten

Om ni behöver nya arbetsplaner framåt är det bättre att skapa dem tillfälligt under implementation och sedan antingen ta bort dem eller flytta in slutsatserna i de permanenta docs-filerna ovan.
