# API

## Översikt

- Base path: `/api`
- Transport: JSON över HTTP
- Kontrakt: `lib/api-spec/openapi.yaml`
- Runtime-validering: `@workspace/api-zod`
- Auth: Supabase bearer-token för interna routes

## Endpoint-sammanfattning

| Method | Path | Auth | Syfte |
| --- | --- | --- | --- |
| `GET` | `/api/healthz` | Nej | Health check |
| `GET` | `/api/me` | Ja | Hämtar användare, profil, workspace och company profile |
| `GET` | `/api/company-profile` | Ja | Hämtar företagets standardprofil |
| `PUT` | `/api/company-profile` | Ja | Uppdaterar företagets standardprofil |
| `GET` | `/api/proposals` | Ja | Listar workspace-offerter |
| `POST` | `/api/proposals` | Ja | Skapar ny offert |
| `GET` | `/api/proposals/:id` | Ja | Hämtar offert |
| `PUT` | `/api/proposals/:id` | Ja | Uppdaterar offertutkast |
| `DELETE` | `/api/proposals/:id` | Ja | Raderar offert |
| `POST` | `/api/proposals/:id/send` | Ja | Skickar offert och skapar signerbar revision |
| `GET` | `/api/proposals/:id/evidence` | Ja | Hämtar evidence package |
| `GET` | `/api/proposals/:id/pdf` | Ja | Genererar intern PDF-export av offert |
| `GET` | `/api/proposals/public/:slug` | Personlig länk eller workspace-auth | Läs skyddad offertvy |
| `POST` | `/api/proposals/public/:slug/respond` | Personlig länk | Acceptera eller avböj publik offert |
| `GET` | `/api/proposals/public/:slug/pdf` | Personlig länk eller workspace-auth | Genererar kund-PDF av publik offert |
| `GET` | `/api/templates` | Ja | Listar built-in + workspace-mallar |
| `POST` | `/api/templates` | Ja | Skapar mall |
| `GET` | `/api/templates/:id` | Ja | Hämtar mall |
| `PUT` | `/api/templates/:id` | Ja | Uppdaterar mall |
| `POST` | `/api/templates/:id/copy` | Ja | Kopierar mall |
| `DELETE` | `/api/templates/:id` | Ja | Raderar mall |

## Viktiga beteenden

### `/api/me`

Returnerar:

- Supabase-användaren
- `profiles`
- `workspaces`
- `company_profiles`

Den används som bas för hela interna app-shellen.

### `/api/company-profile`

Lagrar standarduppgifter för avsändaren:

- företagsnamn
- kontaktperson
- org-nummer
- e-post
- telefon
- adress/postnummer/ort
- webbplats
- logga
- standardvaluta och standardmoms

### `/api/proposals/:id/send`

När en offert skickas gör API:t mer än att bara sätta status:

- låser en signerbar revision
- bygger snapshot av dokumentet
- hash:ar snapshoten
- skapar signing token
- skickar personlig länk via Resend
- loggar audit event

Personliga signeringslänkar utfärdas långlivat och förblir läsbara tills de används för svar eller ersätts av en ny signerbar revision.

### `/api/proposals/public/:slug`

Skyddad route för offertmottagaren och intern preview.

Använder signerbar revision när sådan finns, inte bara den muterbara live-offerten.

- externa visningar med giltig personlig token får full offert
- externa visningar utan giltig token får en låst/gatad vy (`tokenRequired: true`)
- interna workspace-användare kan öppna samma vy med sin vanliga session
- signerade eller avböjda offerter kan fortsatt öppnas via den personliga länken efter att svar registrerats

### `/api/proposals/public/:slug/respond`

Stödjer:

- `accept`
- `decline`

Vid accept krävs signeringsuppgifter och giltigt flöde för personlig länk/token. Signatur och acceptance evidence kopplas till revisionen. Efter lyckat svar markeras tokenen som använd.

### `/api/proposals/public/:slug/pdf`

Returnerar samma signerbara/offentliga offert som PDF.

- accepterar samma personliga `token` som publik läsvy
- fungerar även för interna workspace-användare
- används för att låta mottagaren ladda ner signerad eller pågående offert från kundvyn

### `/api/proposals/:id/pdf`

Intern PDF-export för workspace-användare.

- kräver auth
- använder signerbar revision när sådan finns
- används från builder/arkiv för att ladda ner en PDF av aktuell offertversion

### `/api/proposals/:id/evidence`

Returnerar ett evidence package för arkivet, inklusive:

- proposal metadata
- aktiv revision
- audit events
- signing-token metadata
- exported-by metadata

## Auth-modell

- interna routes skyddas av `requireAuth`
- Supabase JWT verifieras mot projektets JWKS
- `workspace_id` löses via användarens profil
- legacy-data kan bootstrap-claimas till första workspace när auth används

## Felmönster

Vanliga svar:

- `401` när bearer-token saknas eller är ogiltig
- `404` när record saknas
- `403` när publik route saknar giltig personlig länk
- `409` vid namnkonflikter, t.ex. mallnamn
- `500` vid oväntade serverfel

## Källa till sanning

När API-dokumentation och implementation skiljer sig åt ska ni i första hand lita på:

1. `lib/api-spec/openapi.yaml`
2. route-implementation i `artifacts/api-server/src/routes/*`
3. frontend-klienten i `artifacts/offera/src/lib/api.ts`
