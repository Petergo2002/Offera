import {
  pgTable,
  text,
  serial,
  jsonb,
  timestamp,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  workspaceId: uuid("workspace_id"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("ovrigt"),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  sections: jsonb("sections").notNull().default([]),
  designSettings: jsonb("design_settings")
    .notNull()
    .default({
      accentColor: "#FF5C00",
      fontPairing: "modern",
      coverEnabled: true,
      coverBackground: "#0F172A",
      logoPosition: "left",
      dividerStyle: "line",
    }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
