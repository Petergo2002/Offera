import { Router, type Request } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  CreateCustomerLinkBody,
  CustomerSchema,
  GetCustomerResponse,
  ListCustomersResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

type CustomerRecord = {
  id: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  orgNumber?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  value?: number | string | null;
  valuePeriod?: "month" | "year" | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CustomerColumnSupport = {
  orgNumber: boolean;
  contactPerson: boolean;
  phone: boolean;
  address: boolean;
  postalCode: boolean;
  city: boolean;
  value: boolean;
  valuePeriod: boolean;
};

let customerColumnSupportPromise: Promise<CustomerColumnSupport> | undefined;

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalEmail(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function normalizeCustomerValue(value: number | string | null | undefined) {
  if (value == null) {
    return null;
  }

  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCustomerValuePeriod(value: string | null | undefined) {
  return value === "month" || value === "year" ? value : null;
}

function toIsoString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date(0).toISOString();
}

function serializeCustomer(customer: CustomerRecord) {
  return {
    id: customer.id,
    workspaceId: customer.workspaceId,
    name: customer.name,
    email: normalizeOptionalEmail(customer.email),
    orgNumber: normalizeOptionalText(customer.orgNumber),
    contactPerson: normalizeOptionalText(customer.contactPerson),
    phone: normalizeOptionalText(customer.phone),
    address: normalizeOptionalText(customer.address),
    postalCode: normalizeOptionalText(customer.postalCode),
    city: normalizeOptionalText(customer.city),
    value: normalizeCustomerValue(customer.value),
    valuePeriod: normalizeCustomerValuePeriod(customer.valuePeriod),
    createdAt: toIsoString(customer.createdAt),
    updatedAt: toIsoString(customer.updatedAt),
  };
}

function toCustomerWriteValues(
  values: Partial<{
    workspaceId: string;
    name: string;
    email: string | null;
    orgNumber: string | null;
    contactPerson: string | null;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    value: number | null;
    valuePeriod: "month" | "year" | null;
  }>,
  columnSupport: CustomerColumnSupport,
) {
  const writeValues: Record<string, unknown> = {};

  if ("workspaceId" in values) writeValues.workspaceId = values.workspaceId;
  if ("name" in values) writeValues.name = values.name;
  if ("email" in values) writeValues.email = values.email;
  if (columnSupport.orgNumber && "orgNumber" in values) writeValues.orgNumber = values.orgNumber;
  if (columnSupport.contactPerson && "contactPerson" in values) writeValues.contactPerson = values.contactPerson;
  if (columnSupport.phone && "phone" in values) writeValues.phone = values.phone;
  if (columnSupport.address && "address" in values) writeValues.address = values.address;
  if (columnSupport.postalCode && "postalCode" in values) writeValues.postalCode = values.postalCode;
  if (columnSupport.city && "city" in values) writeValues.city = values.city;
  if (columnSupport.value && "value" in values) {
    writeValues.value =
      typeof values.value === "number"
        ? values.value.toFixed(2)
        : values.value;
  }
  if (columnSupport.valuePeriod && "valuePeriod" in values) writeValues.valuePeriod = values.valuePeriod;

  return writeValues;
}

async function getDbModule() {
  const [
    { db },
    {
      customersTable,
      customerLinksTable,
      proposalsTable,
    },
  ] = await Promise.all([
    import("@workspace/db"),
    import("@workspace/db/schema"),
  ]);

  return {
    db,
    customersTable,
    customerLinksTable,
    proposalsTable,
  };
}

async function getCustomerColumnSupport(
  db: Awaited<ReturnType<typeof getDbModule>>["db"],
) {
  if (!customerColumnSupportPromise) {
    customerColumnSupportPromise = (async () => {
      const result = await db.execute(
        sql<{ column_name: string }>`
          select column_name
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'customers'
        `,
      );
      const columnNames = new Set(result.rows.map((row) => row.column_name));

      return {
        orgNumber: columnNames.has("org_number"),
        contactPerson: columnNames.has("contact_person"),
        phone: columnNames.has("phone"),
        address: columnNames.has("address"),
        postalCode: columnNames.has("postal_code"),
        city: columnNames.has("city"),
        value: columnNames.has("value"),
        valuePeriod: columnNames.has("value_period"),
      } satisfies CustomerColumnSupport;
    })();
  }

  return customerColumnSupportPromise;
}

function getCustomerSelectShape(
  customersTable: Awaited<ReturnType<typeof getDbModule>>["customersTable"],
  columnSupport: CustomerColumnSupport,
) {
  return {
    id: customersTable.id,
    workspaceId: customersTable.workspaceId,
    name: customersTable.name,
    email: customersTable.email,
    ...(columnSupport.orgNumber ? { orgNumber: customersTable.orgNumber } : {}),
    ...(columnSupport.contactPerson
      ? { contactPerson: customersTable.contactPerson }
      : {}),
    ...(columnSupport.phone ? { phone: customersTable.phone } : {}),
    ...(columnSupport.address ? { address: customersTable.address } : {}),
    ...(columnSupport.postalCode ? { postalCode: customersTable.postalCode } : {}),
    ...(columnSupport.city ? { city: customersTable.city } : {}),
    ...(columnSupport.value ? { value: customersTable.value } : {}),
    ...(columnSupport.valuePeriod ? { valuePeriod: customersTable.valuePeriod } : {}),
    createdAt: customersTable.createdAt,
    updatedAt: customersTable.updatedAt,
  };
}

function parseCustomerList(customers: CustomerRecord[], req: Request) {
  const serializedCustomers = customers.flatMap((customer) => {
    const serializedCustomer = serializeCustomer(customer);
    const parsedCustomer = CustomerSchema.safeParse(serializedCustomer);

    if (!parsedCustomer.success) {
      req.log.warn(
        {
          customerId: customer.id,
          issues: parsedCustomer.error.issues,
        },
        "Skipping invalid customer record",
      );
      return [];
    }

    return [parsedCustomer.data];
  });

  return ListCustomersResponse.parse(serializedCustomers);
}

// List all customers in workspace
router.get("/", async (req, res) => {
  try {
    const workspaceId = req.auth!.workspaceId;
    const { db, customersTable } = await getDbModule();
    const columnSupport = await getCustomerColumnSupport(db);

    const customers = await db
      .select(getCustomerSelectShape(customersTable, columnSupport))
      .from(customersTable)
      .where(eq(customersTable.workspaceId, workspaceId))
      .orderBy(customersTable.name);

    return res.json(parseCustomerList(customers as CustomerRecord[], req));
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get single customer with links and proposals
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.auth!.workspaceId;
    const { db, customersTable, customerLinksTable, proposalsTable } = await getDbModule();
    const columnSupport = await getCustomerColumnSupport(db);

    const [customer] = await db
      .select(getCustomerSelectShape(customersTable, columnSupport))
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, id),
          eq(customersTable.workspaceId, workspaceId)
        )
      );

    if (!customer) {
      return res.status(404).json({ error: "Kund hittades inte" });
    }

    const [links, proposals] = await Promise.all([
      db
        .select()
        .from(customerLinksTable)
        .where(eq(customerLinksTable.customerId, customer.id))
        .orderBy(customerLinksTable.createdAt),
      db
        .select()
        .from(proposalsTable)
        .where(
          and(
            eq(proposalsTable.customerId, customer.id),
            eq(proposalsTable.workspaceId, workspaceId)
          )
        )
        .orderBy(proposalsTable.updatedAt),
    ]);

    return res.json(GetCustomerResponse.parse({
      ...serializeCustomer(customer as CustomerRecord),
      links,
      proposals: proposals.reverse(),
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to get customer detail");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create customer manually
router.post("/", async (req, res) => {
  try {
    const workspaceId = req.auth!.workspaceId;
    const body = CreateCustomerBody.parse(req.body);
    const { db, customersTable } = await getDbModule();
    const columnSupport = await getCustomerColumnSupport(db);

    if (body.orgNumber && /^\d{10}$/.test(body.orgNumber)) {
      body.orgNumber = `${body.orgNumber.slice(0, 6)}-${body.orgNumber.slice(6)}`;
    }

    const [customer] = await db
      .insert(customersTable)
      .values(
        toCustomerWriteValues(
          {
            workspaceId,
            name: body.name,
            email: body.email ?? null,
            orgNumber: body.orgNumber ?? null,
            contactPerson: body.contactPerson ?? null,
            phone: body.phone ?? null,
            address: body.address ?? null,
            postalCode: body.postalCode ?? null,
            city: body.city ?? null,
            value: body.value ?? null,
            valuePeriod: body.valuePeriod ?? null,
          },
          columnSupport,
        ) as typeof customersTable.$inferInsert,
      )
      .returning();

    return res.status(201).json(serializeCustomer(customer as CustomerRecord));
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update customer
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.auth!.workspaceId;
    const body = UpdateCustomerBody.parse(req.body);
    const { db, customersTable } = await getDbModule();
    const columnSupport = await getCustomerColumnSupport(db);
    
    // Auto-format org number if it's 10 digits without hyphen
    if (body.orgNumber && /^\d{10}$/.test(body.orgNumber)) {
      body.orgNumber = `${body.orgNumber.slice(0, 6)}-${body.orgNumber.slice(6)}`;
    }

    const [updated] = await db
      .update(customersTable)
      .set(
        {
          ...toCustomerWriteValues(body, columnSupport),
          updatedAt: new Date(),
        } as Partial<typeof customersTable.$inferInsert>,
      )
      .where(
        and(
          eq(customersTable.id, id),
          eq(customersTable.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Kund hittades inte" });
    }

    return res.json(serializeCustomer(updated as CustomerRecord));
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.auth!.workspaceId;
    const { db, customersTable } = await getDbModule();

    const [deleted] = await db
      .delete(customersTable)
      .where(
        and(
          eq(customersTable.id, id),
          eq(customersTable.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Kund hittades inte" });
    }

    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Links management
router.post("/:id/links", async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const workspaceId = req.auth!.workspaceId;
    const body = CreateCustomerLinkBody.parse(req.body);
    const { db, customersTable, customerLinksTable } = await getDbModule();

    // Verify customer belongs to workspace
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, customerId),
          eq(customersTable.workspaceId, workspaceId)
        )
      );

    if (!customer) {
      return res.status(404).json({ error: "Kund hittades inte" });
    }

    const [link] = await db
      .insert(customerLinksTable)
      .values({
        customerId,
        workspaceId,
        sectionName: body.sectionName,
        label: body.label,
        url: body.url,
      })
      .returning();

    return res.status(201).json(link);
  } catch (err) {
    req.log.error({ err }, "Failed to add customer link");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/links/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;
    const workspaceId = req.auth!.workspaceId;
    const { db, customerLinksTable } = await getDbModule();

    const [deleted] = await db
      .delete(customerLinksTable)
      .where(
        and(
          eq(customerLinksTable.id, linkId),
          eq(customerLinksTable.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Länk hittades inte" });
    }

    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete link");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
