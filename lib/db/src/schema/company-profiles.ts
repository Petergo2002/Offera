import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const companyProfilesTable = pgTable("company_profiles", {
  workspaceId: uuid("workspace_id").primaryKey(),
  companyName: text("company_name").notNull().default(""),
  contactName: text("contact_name").notNull().default(""),
  orgNumber: text("org_number").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  city: text("city").notNull().default(""),
  website: text("website").notNull().default(""),
  logoUrl: text("logo_url"),
  defaultCurrency: text("default_currency").notNull().default("SEK"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("25"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CompanyProfile = typeof companyProfilesTable.$inferSelect;
