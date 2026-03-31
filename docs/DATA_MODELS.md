# Data Models

## Domänöversikt

Offera kretsar kring fyra huvuddomäner:

1. auth och workspace-ägande
2. offerter
3. mallar
4. evidence/signering

## Auth och workspace

### `workspaces`

Ett workspace per konto i nuvarande modell.

Viktiga fält:

- `id`
- `owner_user_id`
- `name`
- timestamps

### `profiles`

Kopplar `auth.users` till workspace.

Viktiga fält:

- `id`
- `email`
- `display_name`
- `workspace_id`

### `company_profiles`

Standardavsändaren för nya offerter.

Viktiga fält:

- `workspace_id`
- `company_name`
- `contact_name`
- `org_number`
- `email`
- `phone`
- `address`
- `postal_code`
- `city`
- `website`
- `logo_url`
- `default_currency`
- `default_tax_rate`

## Offertmodell

### `proposals`

Den redigerbara live-offerten.

Viktiga fält:

- `workspace_id`
- `title`
- `client_name`
- `client_email`
- `status`
- `total_value`
- `public_slug`
- `template_id`
- `active_revision_id`
- `sections` (`jsonb`)
- `branding` (`jsonb`)
- `parties` (`jsonb`)
- `personal_message`
- signeringsfält på live-recorden för enkel åtkomst i UI

### Statusvärden

- `draft`
- `sent`
- `viewed`
- `accepted`
- `declined`

## Signerbar revision

### `proposal_revisions`

Den låsta versionen som faktiskt skickas och signeras.

Viktiga fält:

- `proposal_id`
- `revision_number`
- `snapshot`
- `snapshot_hash`
- `signing_recipient_email`
- `resend_email_id`
- `is_active`
- `sent_at`
- `viewed_at`
- `signed_at`
- `declined_at`
- `tampered_at`
- signeringsfält och `acceptance_evidence`

### `snapshot`

Snapshoten innehåller den signerbara versionen av:

- titel
- kundnamn/-mejl
- totalvärde
- public slug
- template-id
- sections
- branding
- parties
- personal message
- signing recipient email
- created/updated/sent timestamps

## Audit trail

### `proposal_audit_events`

Loggar viktiga händelser för beviskedjan.

Exempel på event types:

- `proposal_created`
- `proposal_updated`
- `proposal_sent`
- `proposal_viewed`
- `signing_link_opened`
- `proposal_signed`
- `proposal_declined`
- `new_revision_created`
- `confirmation_sent`
- `tamper_detected`

## Signeringstokens

### `proposal_signing_tokens`

Kopplar personlig länktoken till proposal/revision/mottagare.

Typiska fält:

- `proposal_id`
- `revision_id`
- hashad token
- recipient email
- expires_at
- used_at

## Mallar

### `templates`

Återanvändbara dokumentmallar.

Viktiga fält:

- `workspace_id`
- `name`
- `description`
- `category`
- `is_builtin`
- `sections`
- `design_settings`

Built-in-mallar har `workspace_id = null` och `is_builtin = true`.

## Frontend-dokumentmodell

### `sections`

Varje offert och mall består av ordnade sektioner:

```ts
{
  id: string;
  title: string;
  blocks: ContentBlock[];
}
```

### `ContentBlock`

Stödda blocktyper:

- `heading`
- `text`
- `image`
- `pricing`
- `divider`

### `PricingRow`

```ts
{
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  type: "one_time" | "recurring";
  interval?: "monthly" | "yearly";
  bindingPeriod?: number;
  total: number;
}
```

Pricing-blocket har även:

- `discount`
- `vatEnabled`

## Viktig princip

`proposals` är arbetskopian. `proposal_revisions` är den signerbara sanningen. Dokumentintegritet och evidence ska därför alltid knytas till revisioner, inte bara till live-offerten.
