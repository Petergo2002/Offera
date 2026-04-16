import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  CreateCustomerLinkBody,
  GetCustomerResponse,
  ListCustomersResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

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

// List all customers in workspace
router.get("/", async (req, res) => {
  try {
    const workspaceId = req.auth!.workspaceId;
    const { db, customersTable } = await getDbModule();

    const customers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.workspaceId, workspaceId))
      .orderBy(customersTable.name);

    return res.json(customers);
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

    const [customer] = await db
      .select()
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

    return res.json({
      ...customer,
      links,
      proposals: proposals.reverse(),
    });
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

    const [customer] = await db
      .insert(customersTable)
      .values({
        workspaceId,
        ...body,
      })
      .returning();

    return res.status(201).json(customer);
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
    
    // Auto-format org number if it's 10 digits without hyphen
    if (body.orgNumber && /^\d{10}$/.test(body.orgNumber)) {
      body.orgNumber = `${body.orgNumber.slice(0, 6)}-${body.orgNumber.slice(6)}`;
    }

    const [updated] = await db
      .update(customersTable)
      .set({
        ...body,
        updatedAt: new Date(),
      })
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

    return res.json(updated);
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
