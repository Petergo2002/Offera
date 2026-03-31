import { Router, type IRouter } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import {
  CopyTemplateBody,
  CreateTemplateBody,
  UpdateTemplateBody,
  type Proposal,
  type TemplateCategory,
} from "@workspace/api-zod";
import {
  BUILTIN_TEMPLATES,
  DEFAULT_DESIGN_SETTINGS,
  copyTemplate as copyLocalTemplate,
  createTemplate as createLocalTemplate,
  deleteTemplate as deleteLocalTemplate,
  getDefaultCoverHeadline,
  getTemplateById as getLocalTemplateById,
  listTemplates as listLocalTemplates,
  makeDefaultSections,
  sanitizeSectionsForTemplate,
  updateTemplate as updateLocalTemplate,
} from "../lib/local-store";
import { requireAuth } from "../lib/auth";
import { normalizeProposalSections } from "../lib/legacy-content";

const router: IRouter = Router();
const hasDatabase = Boolean(process.env.DATABASE_URL);
let seedPromise: Promise<void> | undefined;

router.use(requireAuth);

type TemplateRecord = {
  id: number;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  designSettings: unknown;
  sections: unknown;
  isBuiltin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function getDbModule() {
  const [{ db }, { proposalsTable, templatesTable }] = await Promise.all([
    import("@workspace/db"),
    import("@workspace/db/schema"),
  ]);

  return { db, proposalsTable, templatesTable };
}

function serializeTemplate(template: TemplateRecord, usageCount: number) {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? undefined,
    category: template.category,
    designSettings: template.designSettings,
    sections: normalizeProposalSections(template.sections),
    isBuiltIn: template.isBuiltin,
    usageCount,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

async function getUsageCountMap(workspaceId: string) {
  if (!hasDatabase) {
    return new Map<number, number>();
  }

  const { db, proposalsTable } = await getDbModule();
  const proposals = await db
    .select()
    .from(proposalsTable)
    .where(eq(proposalsTable.workspaceId, workspaceId));
  const usageMap = new Map<number, number>();

  for (const proposal of proposals) {
    if (!proposal.templateId) continue;
    usageMap.set(proposal.templateId, (usageMap.get(proposal.templateId) ?? 0) + 1);
  }

  return usageMap;
}

async function ensureBuiltinTemplates() {
  if (!hasDatabase) {
    await listLocalTemplates();
    return;
  }

  if (!seedPromise) {
    seedPromise = (async () => {
      const { db, templatesTable } = await getDbModule();
      const existing = await db.select().from(templatesTable);
      const existingNames = new Set(existing.map((template) => template.name));

      for (const template of BUILTIN_TEMPLATES) {
        if (existingNames.has(template.name)) {
          continue;
        }

        await db.insert(templatesTable).values({
          workspaceId: null,
          name: template.name,
          description: template.description ?? null,
          category: template.category,
          isBuiltin: true,
          sections:
            template.sections as unknown as typeof templatesTable.$inferInsert["sections"],
          designSettings:
            template.designSettings as unknown as typeof templatesTable.$inferInsert["designSettings"],
        });
      }
    })();
  }

  await seedPromise;
}

async function hasDuplicateTemplateName(
  workspaceId: string,
  name: string,
  excludeId?: number,
) {
  if (!hasDatabase) {
    return false;
  }

  const { db, templatesTable } = await getDbModule();
  const templates = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.workspaceId, workspaceId));
  const normalized = name.trim().replace(/\s+/g, " ").toLowerCase();

  return templates.some(
    (template) =>
      template.id !== excludeId &&
      template.name.trim().replace(/\s+/g, " ").toLowerCase() === normalized,
  );
}

function getCopyName(existingNames: string[], baseName: string) {
  const normalizedNames = new Set(
    existingNames.map((name) => name.trim().replace(/\s+/g, " ").toLowerCase()),
  );
  const root = `${baseName} (kopia)`;

  if (!normalizedNames.has(root.toLowerCase())) {
    return root;
  }

  let index = 2;
  while (normalizedNames.has(`${root} ${index}`.toLowerCase())) {
    index += 1;
  }

  return `${root} ${index}`;
}

router.get("/", async (req, res) => {
  try {
    await ensureBuiltinTemplates();

    if (!hasDatabase) {
      const templates = await listLocalTemplates();
      res.json(templates);
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const { db, templatesTable } = await getDbModule();
    const [templates, usageMap] = await Promise.all([
      db
        .select()
        .from(templatesTable)
        .where(
          or(
            eq(templatesTable.workspaceId, workspaceId),
            and(isNull(templatesTable.workspaceId), eq(templatesTable.isBuiltin, true)),
          ),
        ),
      getUsageCountMap(workspaceId),
    ]);

    res.json(
      templates
        .map((template) =>
          serializeTemplate(
            template as unknown as TemplateRecord,
            usageMap.get(template.id) ?? 0,
          ),
        )
        .sort((a, b) => {
          if (a.isBuiltIn !== b.isBuiltIn) {
            return a.isBuiltIn ? -1 : 1;
          }

          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    if (!hasDatabase) {
      const template = await getLocalTemplateById(id);
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      res.json(template);
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const { db, templatesTable } = await getDbModule();
    const [template, usageMap] = await Promise.all([
      db
        .select()
        .from(templatesTable)
        .where(
          and(
            eq(templatesTable.id, id),
            or(
              eq(templatesTable.workspaceId, workspaceId),
              and(isNull(templatesTable.workspaceId), eq(templatesTable.isBuiltin, true)),
            ),
          ),
        ),
      getUsageCountMap(workspaceId),
    ]);

    if (!template[0]) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.json(
      serializeTemplate(
        template[0] as unknown as TemplateRecord,
        usageMap.get(id) ?? 0,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get template");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateTemplateBody.parse(req.body);

    if (!hasDatabase) {
      const template = await createLocalTemplate(body);
      res.status(201).json(template);
      return;
    }

    const workspaceId = req.auth!.workspaceId;

    if (await hasDuplicateTemplateName(workspaceId, body.name)) {
      res.status(409).json({ error: "En mall med det namnet finns redan." });
      return;
    }

    const { db, proposalsTable, templatesTable } = await getDbModule();
    const sourceProposal = body.sourceProposalId
      ? await db
          .select()
          .from(proposalsTable)
          .where(
            and(
              eq(proposalsTable.id, body.sourceProposalId),
              eq(proposalsTable.workspaceId, workspaceId),
            ),
          )
          .then((rows) => rows[0])
      : undefined;

    if (body.sourceProposalId && !sourceProposal) {
      res.status(404).json({ error: "Source proposal not found" });
      return;
    }

    const sections = sourceProposal
      ? sanitizeSectionsForTemplate({
          ...(sourceProposal as unknown as Proposal),
          branding: sourceProposal.branding as Proposal["branding"],
          sections: sourceProposal.sections as Proposal["sections"],
        })
      : body.sections ?? makeDefaultSections();
    const designSettings = sourceProposal
      ? {
          ...(sourceProposal.branding as Proposal["branding"]),
          coverHeadline:
            (sourceProposal.branding as Proposal["branding"]).coverHeadline ??
            getDefaultCoverHeadline(body.category),
        }
      : body.designSettings ?? DEFAULT_DESIGN_SETTINGS;

    const [template] = await db
      .insert(templatesTable)
      .values({
        workspaceId,
        name: body.name.trim(),
        description: trimToUndefined(body.description) ?? null,
        category: body.category,
        isBuiltin: false,
        sections:
          sections as unknown as typeof templatesTable.$inferInsert["sections"],
        designSettings:
          designSettings as unknown as typeof templatesTable.$inferInsert["designSettings"],
      })
      .returning();

    res.status(201).json(
      serializeTemplate(template as unknown as TemplateRecord, 0),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to create template");
    if (err instanceof Error && err.message === "En mall med det namnet finns redan.") {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const body = UpdateTemplateBody.parse(req.body);

    if (!hasDatabase) {
      const updated = await updateLocalTemplate(id, body);
      if (!updated) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      if (updated === "builtin") {
        res.status(403).json({ error: "Inbyggda mallar kan inte redigeras." });
        return;
      }

      res.json(updated);
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const { db, templatesTable } = await getDbModule();
    const [template] = await db
      .select()
      .from(templatesTable)
      .where(
        and(
          eq(templatesTable.id, id),
          eq(templatesTable.workspaceId, workspaceId),
        ),
      );

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    if (template.isBuiltin) {
      res.status(403).json({ error: "Inbyggda mallar kan inte redigeras." });
      return;
    }

    if (body.name && (await hasDuplicateTemplateName(workspaceId, body.name, id))) {
      res.status(409).json({ error: "En mall med det namnet finns redan." });
      return;
    }

    const [updated] = await db
      .update(templatesTable)
      .set({
        name: body.name?.trim() ?? template.name,
        description:
          body.description !== undefined
            ? trimToUndefined(body.description) ?? null
            : template.description,
        category: body.category ?? template.category,
        sections:
          (body.sections ?? template.sections) as typeof templatesTable.$inferInsert["sections"],
        designSettings:
          (body.designSettings ?? template.designSettings) as typeof templatesTable.$inferInsert["designSettings"],
        updatedAt: new Date(),
      })
      .where(eq(templatesTable.id, id))
      .returning();

    const usageMap = await getUsageCountMap(workspaceId);
    res.json(
      serializeTemplate(updated as unknown as TemplateRecord, usageMap.get(id) ?? 0),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to update template");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/copy", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const body = CopyTemplateBody.parse(req.body ?? {});

    if (!hasDatabase) {
      const copy = await copyLocalTemplate(id, body);
      if (!copy) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.status(201).json(copy);
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const { db, templatesTable } = await getDbModule();
    const [template, templates] = await Promise.all([
      db
        .select()
        .from(templatesTable)
        .where(
          and(
            eq(templatesTable.id, id),
            or(
              eq(templatesTable.workspaceId, workspaceId),
              and(isNull(templatesTable.workspaceId), eq(templatesTable.isBuiltin, true)),
            ),
          ),
        )
        .then((rows) => rows[0]),
      db.select().from(templatesTable).where(eq(templatesTable.workspaceId, workspaceId)),
    ]);

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const nextName =
      trimToUndefined(body.name) ?? getCopyName(templates.map((entry) => entry.name), template.name);

    if (await hasDuplicateTemplateName(workspaceId, nextName)) {
      res.status(409).json({ error: "En mall med det namnet finns redan." });
      return;
    }

    const [copy] = await db
      .insert(templatesTable)
      .values({
        workspaceId,
        name: nextName,
        description:
          body.description !== undefined
            ? trimToUndefined(body.description) ?? null
            : template.description,
        category: body.category ?? template.category,
        isBuiltin: false,
        sections: template.sections,
        designSettings: template.designSettings,
      })
      .returning();

    res.status(201).json(
      serializeTemplate(copy as unknown as TemplateRecord, 0),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to copy template");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    if (!hasDatabase) {
      const result = await deleteLocalTemplate(id);
      if (result === "missing") {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      if (result === "builtin") {
        res.status(403).json({ error: "Cannot delete built-in templates" });
        return;
      }
      res.status(204).send();
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const { db, templatesTable } = await getDbModule();
    const [template] = await db
      .select()
      .from(templatesTable)
      .where(
        and(
          eq(templatesTable.id, id),
          eq(templatesTable.workspaceId, workspaceId),
        ),
      );

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    if (template.isBuiltin) {
      res.status(403).json({ error: "Cannot delete built-in templates" });
      return;
    }

    await db
      .delete(templatesTable)
      .where(
        and(
          eq(templatesTable.id, id),
          eq(templatesTable.workspaceId, workspaceId),
        ),
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete template");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
