import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type ProposalAuditEventType =
  | "proposal_created"
  | "proposal_updated"
  | "proposal_sent"
  | "proposal_viewed"
  | "signing_link_opened"
  | "proposal_signed"
  | "proposal_declined"
  | "new_revision_created"
  | "tamper_detected"
  | "confirmation_sent";

export type ProposalAuditActorType = "system" | "sender" | "recipient";

export const proposalAuditEventsTable = pgTable(
  "proposal_audit_events",
  {
    id: serial("id").primaryKey(),
    workspaceId: uuid("workspace_id"),
    proposalId: integer("proposal_id").notNull(),
    revisionId: integer("revision_id"),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorEmail: text("actor_email"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    proposalIdIdx: index("idx_proposal_audit_events_proposal_id").on(table.proposalId),
    revisionIdIdx: index("idx_proposal_audit_events_revision_id").on(table.revisionId),
    eventTypeIdx: index("idx_proposal_audit_events_event_type").on(table.eventType),
    createdAtIdx: index("idx_proposal_audit_events_created_at").on(table.createdAt),
  }),
);
