import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, proposalsTable } from "@workspace/db";
import {
  CreateProposalBody,
  UpdateProposalBody,
  SendProposalBody,
  RespondToProposalBody,
} from "@workspace/api-zod";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function generateSlug(): string {
  return randomBytes(5).toString("hex");
}

function makeDefaultSections() {
  return [
    {
      id: randomBytes(4).toString("hex"),
      title: "Cover",
      blocks: [
        { id: randomBytes(4).toString("hex"), type: "heading", content: "Offert", level: 1 },
        { id: randomBytes(4).toString("hex"), type: "text", content: "Tack för att du kontaktade oss. Vi ser fram emot att arbeta med er." },
      ],
    },
    {
      id: randomBytes(4).toString("hex"),
      title: "About Us",
      blocks: [
        { id: randomBytes(4).toString("hex"), type: "heading", content: "Om oss", level: 2 },
        { id: randomBytes(4).toString("hex"), type: "text", content: "Vi är ett erfaret team med fokus på att leverera högkvalitativa lösningar." },
      ],
    },
    {
      id: randomBytes(4).toString("hex"),
      title: "Scope of Work",
      blocks: [
        { id: randomBytes(4).toString("hex"), type: "heading", content: "Uppdragets omfattning", level: 2 },
        { id: randomBytes(4).toString("hex"), type: "text", content: "Beskriv uppdraget och vad som ingår här." },
      ],
    },
    {
      id: randomBytes(4).toString("hex"),
      title: "Pricing",
      blocks: [
        { id: randomBytes(4).toString("hex"), type: "heading", content: "Prissättning", level: 2 },
        {
          id: randomBytes(4).toString("hex"),
          type: "pricing",
          rows: [
            { id: randomBytes(4).toString("hex"), description: "Konsulttjänst", quantity: 1, unitPrice: 15000, total: 15000 },
          ],
          discount: 0,
          vatEnabled: true,
        },
      ],
    },
    {
      id: randomBytes(4).toString("hex"),
      title: "Terms",
      blocks: [
        { id: randomBytes(4).toString("hex"), type: "heading", content: "Villkor", level: 2 },
        { id: randomBytes(4).toString("hex"), type: "text", content: "Betalningsvillkor: 30 dagar netto. Offerten är giltig i 30 dagar från utfärdandedatum." },
      ],
    },
    {
      id: randomBytes(4).toString("hex"),
      title: "Signature",
      blocks: [
        { id: randomBytes(4).toString("hex"), type: "heading", content: "Signatur", level: 2 },
        { id: randomBytes(4).toString("hex"), type: "text", content: "Acceptera offerten digitalt via knappen nedan." },
        { id: randomBytes(4).toString("hex"), type: "divider" },
      ],
    },
  ];
}

function serializeProposal(p: typeof proposalsTable.$inferSelect) {
  return {
    id: p.id,
    title: p.title,
    clientName: p.clientName,
    clientEmail: p.clientEmail ?? undefined,
    status: p.status,
    totalValue: Number(p.totalValue),
    publicSlug: p.publicSlug,
    sections: p.sections as unknown[],
    branding: p.branding as unknown,
    personalMessage: p.personalMessage ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    lastActivityAt: p.lastActivityAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const proposals = await db
      .select()
      .from(proposalsTable)
      .orderBy(proposalsTable.updatedAt);
    res.json(proposals.reverse().map(serializeProposal));
  } catch (err) {
    req.log.error({ err }, "Failed to list proposals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateProposalBody.parse(req.body);
    const slug = generateSlug();
    const [proposal] = await db
      .insert(proposalsTable)
      .values({
        title: body.title,
        clientName: body.clientName ?? "",
        clientEmail: body.clientEmail ?? null,
        status: "draft",
        publicSlug: slug,
        sections: makeDefaultSections() as unknown as typeof proposalsTable.$inferInsert["sections"],
        branding: { accentColor: "#FF5C00", font: "inter" } as unknown as typeof proposalsTable.$inferInsert["branding"],
      })
      .returning();
    res.status(201).json(serializeProposal(proposal));
  } catch (err) {
    req.log.error({ err }, "Failed to create proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.publicSlug, slug));
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    if (proposal.status === "sent") {
      await db
        .update(proposalsTable)
        .set({ status: "viewed", lastActivityAt: new Date() })
        .where(eq(proposalsTable.id, proposal.id));
      proposal.status = "viewed";
    }
    res.json(serializeProposal(proposal));
  } catch (err) {
    req.log.error({ err }, "Failed to get public proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/:slug/respond", async (req, res) => {
  try {
    const { slug } = req.params;
    const body = RespondToProposalBody.parse(req.body);
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.publicSlug, slug));
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    const newStatus = body.action === "accept" ? "accepted" : "declined";
    const [updated] = await db
      .update(proposalsTable)
      .set({ status: newStatus, lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(proposalsTable.id, proposal.id))
      .returning();
    res.json(serializeProposal(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to respond to proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, id));
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    res.json(serializeProposal(proposal));
  } catch (err) {
    req.log.error({ err }, "Failed to get proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const body = UpdateProposalBody.parse(req.body);
    const updates: Partial<typeof proposalsTable.$inferInsert> = {
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };
    if (body.title !== undefined) updates.title = body.title;
    if (body.clientName !== undefined) updates.clientName = body.clientName;
    if (body.clientEmail !== undefined) updates.clientEmail = body.clientEmail;
    if (body.sections !== undefined) updates.sections = body.sections as unknown as typeof proposalsTable.$inferInsert["sections"];
    if (body.branding !== undefined) updates.branding = body.branding as unknown as typeof proposalsTable.$inferInsert["branding"];
    if (body.totalValue !== undefined) updates.totalValue = body.totalValue.toString();

    const [updated] = await db
      .update(proposalsTable)
      .set(updates)
      .where(eq(proposalsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    res.json(serializeProposal(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(proposalsTable).where(eq(proposalsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/send", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const body = SendProposalBody.parse(req.body);
    const [updated] = await db
      .update(proposalsTable)
      .set({
        status: "sent",
        clientEmail: body.clientEmail,
        personalMessage: body.personalMessage ?? null,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(proposalsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    res.json(serializeProposal(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to send proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
