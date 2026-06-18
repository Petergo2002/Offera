import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Parse the DATABASE_URL using Node's built-in URL API instead of relying on
 * pg's internal URL parser. pg v8 misidentifies Supabase's pooler username
 * format (e.g. "postgres.xigndyzuojlplzknvpab") as a hostname, causing
 * ENOTFOUND errors. Passing individual params bypasses that bug entirely.
 */
function parseConnectionString(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: parsed.searchParams.get("sslmode") !== "disable" ? { rejectUnauthorized: false } : false,
  };
}

export const pool = new Pool({
  ...parseConnectionString(process.env.DATABASE_URL),
  application_name: "quote-builder-pro-api",
});
export const db = drizzle(pool, { schema });

export {
  companyProfilesTable,
  createDefaultProposalParties,
  createEmptyProposalParty,
  normalizeProposalParties,
  proposalAuditEventsTable,
  proposalRevisionsTable,
  type ProposalParties,
  type ProposalParty,
  type ProposalRecipient,
  type ProposalRecipientKind,
  proposalSigningTokensTable,
  profilesTable,
  proposalsTable,
  templatesTable,
  type ProposalAcceptanceEvidence,
  workspacesTable,
} from "./schema/index.js";
export * from "./schema/index.js";
