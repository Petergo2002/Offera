import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
