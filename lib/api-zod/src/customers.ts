import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} får innehålla högst ${max} tecken`)
    .optional()
    .nullable();

export const OrgNumberSchema = z
  .string()
  .trim()
  .regex(/^(\d{6}-\d{4}|\d{10})$/, "Ange formatet XXXXXX-XXXX eller 10 siffror")
  .or(z.string().trim().length(0))
  .optional()
  .nullable();
export const CustomerValuePeriodSchema = z.enum(["month", "year"]);

const CustomerValueSchema = z.preprocess(
  (value) => {
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
  },
  z
    .union([
      z
        .number()
        .finite("Ange ett giltigt kundvärde")
        .nonnegative("Kundvärdet kan inte vara negativt"),
      z.null(),
    ])
    .optional(),
);

const CustomerBindingMonthsSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) {
        return undefined;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : value;
    }

    return value;
  },
  z
    .union([
      z
        .number()
        .int("Bindningstid måste vara hela månader")
        .positive("Bindningstid måste vara minst en månad"),
      z.null(),
    ])
    .optional(),
);

const CustomerTaxRateSchema = z.preprocess(
  (value) => {
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
  },
  z
    .union([
      z
        .number()
        .finite("Ange en giltig momssats")
        .min(0, "Momssatsen kan inte vara negativ")
        .max(100, "Momssatsen kan inte vara högre än 100 %"),
      z.null(),
    ])
    .optional(),
);

const CustomerBodyFields = {
  name: z
    .string()
    .trim()
    .min(1, "Företagsnamn krävs")
    .max(160, "Företagsnamnet är för långt"),
  email: z
    .string()
    .trim()
    .email("Ange en giltig e-postadress")
    .max(254, "E-postadressen är för lång")
    .optional()
    .nullable()
    .or(z.string().trim().length(0)),
  orgNumber: OrgNumberSchema,
  contactPerson: optionalText(160, "Kontaktpersonen"),
  phone: optionalText(50, "Telefonnumret"),
  address: optionalText(240, "Adressen"),
  postalCode: optionalText(20, "Postnumret"),
  city: optionalText(120, "Orten"),
  value: CustomerValueSchema,
  valuePeriod: CustomerValuePeriodSchema.optional().nullable(),
  bindingMonths: CustomerBindingMonthsSchema,
  taxRate: CustomerTaxRateSchema,
};

function addCustomerValuePairIssues(
  data: {
    value?: number | null;
    valuePeriod?: "month" | "year" | null;
    bindingMonths?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const hasValue = typeof data.value === "number";
  const hasPeriod = data.valuePeriod === "month" || data.valuePeriod === "year";
  const isEmpty =
    data.value == null &&
    data.valuePeriod == null &&
    data.bindingMonths == null;

  if (isEmpty) {
    return;
  }

  if (data.bindingMonths != null && !hasValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bindingMonths"],
      message: "Ange kundvärde innan du sätter bindningstid.",
    });
  }

  if (hasValue === hasPeriod) {
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
  bindingMonths: z.number().int().positive().optional().nullable(),
  taxRate: z.number().finite().min(0).max(100).optional().nullable(),
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

export const CustomerProposalSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string(),
    status: z.enum(["draft", "sent", "viewed", "accepted", "declined"]),
    totalValue: z.preprocess(
      (value) => (typeof value === "string" ? Number(value) : value),
      z.number().finite(),
    ),
    customerId: z.string().uuid().optional().nullable(),
    updatedAt: z.string().or(z.date()),
  })
  .passthrough();

export const ListCustomersResponse = z.array(CustomerSchema);

export const GetCustomerResponse = CustomerSchema.extend({
  proposals: z.array(CustomerProposalSchema),
  links: z.array(CustomerLinkSchema),
});

export const CreateCustomerBody = z
  .object(CustomerBodyFields)
  .superRefine((data, ctx) => {
    addCustomerValuePairIssues(data, ctx);
  });

export const UpdateCustomerBody = z
  .object(CustomerBodyFields)
  .partial()
  .superRefine((data, ctx) => {
    const hasValueKey = Object.prototype.hasOwnProperty.call(data, "value");
    const hasValuePeriodKey = Object.prototype.hasOwnProperty.call(
      data,
      "valuePeriod",
    );
    const hasBindingMonthsKey = Object.prototype.hasOwnProperty.call(
      data,
      "bindingMonths",
    );
    const hasTaxRateKey = Object.prototype.hasOwnProperty.call(data, "taxRate");

    if (
      !hasValueKey &&
      !hasValuePeriodKey &&
      !hasBindingMonthsKey &&
      !hasTaxRateKey
    ) {
      return;
    }

    addCustomerValuePairIssues(
      {
        value: data.value ?? null,
        valuePeriod: data.valuePeriod ?? null,
        bindingMonths: data.bindingMonths ?? null,
      },
      ctx,
    );
  });

export const CreateCustomerLinkBody = z.object({
  sectionName: z
    .string()
    .trim()
    .min(1, "Sektion krävs")
    .max(80, "Sektionsnamnet är för långt"),
  label: z
    .string()
    .trim()
    .min(1, "Beskrivning krävs")
    .max(160, "Beskrivningen är för lång"),
  url: z
    .string()
    .trim()
    .url("Ange en giltig URL")
    .max(2048, "URL:en är för lång"),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerDetail = z.infer<typeof GetCustomerResponse>;
export type CustomerLink = z.infer<typeof CustomerLinkSchema>;
export type CustomerProposal = z.infer<typeof CustomerProposalSchema>;
export type CustomerValuePeriod = z.infer<typeof CustomerValuePeriodSchema>;
export type CreateCustomerRequest = z.infer<typeof CreateCustomerBody>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerBody>;
export type CreateCustomerLinkRequest = z.infer<typeof CreateCustomerLinkBody>;
