import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ProposalAcceptanceEvidence,
  ProposalParties,
} from "./proposals.js";

export type ProposalRevisionSnapshot = {
  version: 1;
  proposalId: number;
  title: string;
  clientName: string;
  clientEmail?: string | null;
  totalValue: string;
  publicSlug: string;
  templateId?: number | null;
  sections: unknown[];
  branding: unknown;
  parties: ProposalParties;
  personalMessage?: string | null;
  signingRecipientEmail: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
};

export const proposalRevisionsTable = pgTable(
  "proposal_revisions",
  {
    id: serial("id").primaryKey(),
    workspaceId: uuid("workspace_id"),
    proposalId: integer("proposal_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    status: text("status").notNull().default("sent"),
    snapshot: jsonb("snapshot").$type<ProposalRevisionSnapshot>().notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    signingRecipientEmail: text("signing_recipient_email").notNull(),
    resendEmailId: text("resend_email_id"),
    isActive: boolean("is_active").notNull().default(false),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    viewedAt: timestamp("viewed_at"),
    signedAt: timestamp("signed_at"),
    declinedAt: timestamp("declined_at"),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    signerInitials: text("signer_initials"),
    signatureDataUrl: text("signature_data_url"),
    acceptanceEvidence: jsonb("acceptance_evidence").$type<ProposalAcceptanceEvidence | null>(),
    tamperedAt: timestamp("tampered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    proposalIdIdx: index("idx_proposal_revisions_proposal_id").on(table.proposalId),
    isActiveIdx: index("idx_proposal_revisions_is_active").on(table.isActive),
    statusIdx: index("idx_proposal_revisions_status").on(table.status),
    sentAtIdx: index("idx_proposal_revisions_sent_at").on(table.sentAt),
    snapshotHashIdx: index("idx_proposal_revisions_snapshot_hash").on(table.snapshotHash),
    proposalRevisionNumberIdx: uniqueIndex(
      "ux_proposal_revisions_proposal_revision_number",
    ).on(table.proposalId, table.revisionNumber),
  }),
);
