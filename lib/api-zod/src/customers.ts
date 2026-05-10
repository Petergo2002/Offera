import { z } from "zod";

export const OrgNumberSchema = z.string().regex(/^(\d{6}-\d{4}|\d{10})$/, "Måste vara i formatet XXXXXX-XXXX eller 10 siffror").or(z.string().length(0)).optional().nullable();
export const CustomerValuePeriodSchema = z.enum(["month", "year"]);

const CustomerValueSchema = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.union([z.number().finite().nonnegative(), z.null()]).optional());

const CustomerBodyFields = {
  name: z.string().min(1, "Namn krävs"),
  email: z.string().email().optional().nullable().or(z.string().length(0)),
  orgNumber: OrgNumberSchema,
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  value: CustomerValueSchema,
  valuePeriod: CustomerValuePeriodSchema.optional().nullable(),
};

function addCustomerValuePairIssues(
  data: { value?: number | null; valuePeriod?: "month" | "year" | null },
  ctx: z.RefinementCtx,
) {
  const hasValue = typeof data.value === "number";
  const hasPeriod = data.valuePeriod === "month" || data.valuePeriod === "year";
  const isEmpty = data.value == null && data.valuePeriod == null;

  if (isEmpty || hasValue === hasPeriod) {
    return;
  }

  if (!hasValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Ange ett kundvärde om du väljer period.",
    });
  }

  if (!hasPeriod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["valuePeriod"],
      message: "Välj månad eller år för kundvärdet.",
    });
  }
}

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
  value: z.number().finite().nonnegative().optional().nullable(),
  valuePeriod: CustomerValuePeriodSchema.optional().nullable(),
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

export const CreateCustomerBody = z.object(CustomerBodyFields).superRefine((data, ctx) => {
  addCustomerValuePairIssues(data, ctx);
});

export const UpdateCustomerBody = z.object(CustomerBodyFields).partial().superRefine((data, ctx) => {
  const hasValueKey = Object.prototype.hasOwnProperty.call(data, "value");
  const hasValuePeriodKey = Object.prototype.hasOwnProperty.call(data, "valuePeriod");

  if (!hasValueKey && !hasValuePeriodKey) {
    return;
  }

  addCustomerValuePairIssues(
    {
      value: data.value ?? null,
      valuePeriod: data.valuePeriod ?? null,
    },
    ctx,
  );
});

export const CreateCustomerLinkBody = z.object({
  sectionName: z.string().min(1, "Sektionsnamn krävs"),
  label: z.string().min(1, "Beskrivning krävs"),
  url: z.string().url("Måste vara en giltig URL"),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerDetail = z.infer<typeof GetCustomerResponse>;
export type CustomerLink = z.infer<typeof CustomerLinkSchema>;
export type CustomerValuePeriod = z.infer<typeof CustomerValuePeriodSchema>;
export type CreateCustomerRequest = z.infer<typeof CreateCustomerBody>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerBody>;
export type CreateCustomerLinkRequest = z.infer<typeof CreateCustomerLinkBody>;
