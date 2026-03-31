import {
  pgTable,
  text,
  serial,
  numeric,
  jsonb,
  timestamp,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type ProposalParty = {
  companyName: string;
  orgNumber: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
};

export type ProposalRecipientKind = "company" | "person";

export type ProposalRecipient = ProposalParty & {
  kind: ProposalRecipientKind;
};

export type ProposalParties = {
  sender: ProposalParty;
  recipient: ProposalRecipient;
};

export type ProposalAcceptanceEvidence = {
  signerName: string;
  signerEmail: string;
  initials: string;
  signatureDataUrl: string;
  termsAccepted: true;
  consentAcceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
};

export function createEmptyProposalParty(): ProposalParty {
  return {
    companyName: "",
    orgNumber: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
  };
}

export function createDefaultProposalParties(): ProposalParties {
  return {
    sender: createEmptyProposalParty(),
    recipient: {
      ...createEmptyProposalParty(),
      kind: "company",
    },
  };
}

export function normalizeProposalParties(
  parties: Partial<ProposalParties> | null | undefined,
  legacyClientName?: string | null,
  legacyClientEmail?: string | null,
): ProposalParties {
  const defaultParties = createDefaultProposalParties();
  const sender = {
    ...defaultParties.sender,
    ...(parties?.sender ?? {}),
  };

  const recipient: ProposalRecipient = {
    ...defaultParties.recipient,
    ...(parties?.recipient ?? {}),
    kind: parties?.recipient?.kind === "person" ? "person" : "company",
  };

  if (!recipient.companyName && legacyClientName) {
    recipient.companyName = legacyClientName;
  }

  if (!recipient.email && legacyClientEmail) {
    recipient.email = legacyClientEmail;
  }

  return { sender, recipient };
}

export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  workspaceId: uuid("workspace_id"),
  title: text("title").notNull(),
  clientName: text("client_name").notNull().default(""),
  clientEmail: text("client_email"),
  status: text("status").notNull().default("draft"),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull().default("0"),
  publicSlug: text("public_slug").notNull().unique(),
  templateId: integer("template_id"),
  activeRevisionId: integer("active_revision_id"),
  sections: jsonb("sections").notNull().default([]),
  branding: jsonb("branding")
    .notNull()
    .default({
      accentColor: "#4e45e4",
      fontPairing: "modern",
      coverEnabled: true,
      coverBackground: "#0F172A",
      logoPosition: "left",
      dividerStyle: "line",
      glassmorphismEnabled: false,
      vibePreset: "architectural",
      gradientEnabled: false,
    }),
  parties: jsonb("parties").$type<ProposalParties>().notNull().default(createDefaultProposalParties()),
  personalMessage: text("personal_message"),
  signedByName: text("signed_by_name"),
  signatureInitials: text("signature_initials"),
  signatureDataUrl: text("signature_data_url"),
  acceptanceEvidence: jsonb("acceptance_evidence").$type<ProposalAcceptanceEvidence | null>(),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
  lastActivityAt: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
