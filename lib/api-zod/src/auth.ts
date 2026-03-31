import { z } from "zod";

export const CompanyProfileSchema = z.object({
  workspaceId: z.string().uuid(),
  companyName: z.string(),
  contactName: z.string(),
  orgNumber: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  postalCode: z.string(),
  city: z.string(),
  website: z.string(),
  logoUrl: z.string().optional(),
  defaultCurrency: z.string(),
  defaultTaxRate: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UpdateCompanyProfileBody = z.object({
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  orgNumber: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  defaultCurrency: z.string().optional(),
  defaultTaxRate: z.number().optional(),
});

export const MeProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  displayName: z.string().optional(),
  workspaceId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MeWorkspaceSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MeResponse = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().optional(),
  }),
  profile: MeProfileSchema,
  workspace: MeWorkspaceSchema,
  companyProfile: CompanyProfileSchema,
});

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;
export type UpdateCompanyProfileRequest = z.infer<typeof UpdateCompanyProfileBody>;
export type MeProfile = z.infer<typeof MeProfileSchema>;
export type MeWorkspace = z.infer<typeof MeWorkspaceSchema>;
export type Me = z.infer<typeof MeResponse>;
