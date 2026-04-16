import { z } from "zod";

export const OrgNumberSchema = z.string().regex(/^(\d{6}-\d{4}|\d{10})$/, "Måste vara i formatet XXXXXX-XXXX eller 10 siffror").or(z.string().length(0)).optional().nullable();

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1, "Namn krävs"),
  email: z.string().email().optional().nullable(),
  orgNumber: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const CustomerLinkSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sectionName: z.string().min(1, "Sektionsnamn krävs"),
  label: z.string().min(1, "Beskrivning krävs"),
  url: z.string().url("Måste vara en giltig URL"),
  createdAt: z.string().or(z.date()),
});

export const ListCustomersResponse = z.array(CustomerSchema);

export const GetCustomerResponse = CustomerSchema.extend({
  proposals: z.array(z.any()), // We'll serialize proposals here
  links: z.array(CustomerLinkSchema),
});

export const CreateCustomerBody = z.object({
  name: z.string().min(1, "Namn krävs"),
  email: z.string().email().optional().nullable().or(z.string().length(0)),
  orgNumber: OrgNumberSchema,
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
});

export const UpdateCustomerBody = CreateCustomerBody.partial();

export const CreateCustomerLinkBody = z.object({
  sectionName: z.string().min(1, "Sektionsnamn krävs"),
  label: z.string().min(1, "Beskrivning krävs"),
  url: z.string().url("Måste vara en giltig URL"),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerLink = z.infer<typeof CustomerLinkSchema>;
export type CreateCustomerRequest = z.infer<typeof CreateCustomerBody>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerBody>;
export type CreateCustomerLinkRequest = z.infer<typeof CreateCustomerLinkBody>;
