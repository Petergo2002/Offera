import { pgTable, text, serial, integer, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientName: text("client_name").notNull().default(""),
  clientEmail: text("client_email"),
  status: text("status").notNull().default("draft"),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull().default("0"),
  publicSlug: text("public_slug").notNull().unique(),
  sections: jsonb("sections").notNull().default([]),
  branding: jsonb("branding").notNull().default({ accentColor: "#FF5C00", font: "inter" }),
  personalMessage: text("personal_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActivityAt: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
