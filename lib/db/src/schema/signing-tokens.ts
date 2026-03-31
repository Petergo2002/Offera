import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const proposalSigningTokensTable = pgTable(
  "proposal_signing_tokens",
  {
    id: serial("id").primaryKey(),
    workspaceId: uuid("workspace_id"),
    proposalId: integer("proposal_id").notNull(),
    revisionId: integer("revision_id"),
    recipientEmail: text("recipient_email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    emailId: text("email_id"),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    proposalIdIdx: index("idx_proposal_signing_tokens_proposal_id").on(table.proposalId),
    revisionIdIdx: index("idx_proposal_signing_tokens_revision_id").on(table.revisionId),
    recipientEmailIdx: index("idx_proposal_signing_tokens_recipient_email").on(
      table.recipientEmail,
    ),
    expiresAtIdx: index("idx_proposal_signing_tokens_expires_at").on(table.expiresAt),
  }),
);
