import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CompanyProfileSchema,
  UpdateCompanyProfileBody,
  type CompanyProfile,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getDbModule() {
  const [{ db }, { companyProfilesTable }] = await Promise.all([
    import("@workspace/db"),
    import("@workspace/db/schema"),
  ]);

  return { db, companyProfilesTable };
}

type CompanyProfileRow = {
  workspaceId: string;
  companyName: string;
  contactName: string;
  orgNumber: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  website: string;
  logoUrl: string | null;
  defaultCurrency: string;
  defaultTaxRate: string | number;
  createdAt: Date;
  updatedAt: Date;
};

function serializeCompanyProfile(profile: CompanyProfileRow): CompanyProfile {
  return {
    workspaceId: profile.workspaceId,
    companyName: profile.companyName,
    contactName: profile.contactName,
    orgNumber: profile.orgNumber,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    postalCode: profile.postalCode,
    city: profile.city,
    website: profile.website,
    logoUrl: profile.logoUrl ?? undefined,
    defaultCurrency: profile.defaultCurrency,
    defaultTaxRate: Number(profile.defaultTaxRate),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { db, companyProfilesTable } = await getDbModule();
    const [profile] = await db
      .select()
      .from(companyProfilesTable)
      .where(eq(companyProfilesTable.workspaceId, req.auth!.workspaceId));

    if (!profile) {
      res.status(404).json({ error: "Company profile not found." });
      return;
    }

    res.json(CompanyProfileSchema.parse(serializeCompanyProfile(profile)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to get company profile");
    res.status(500).json({ error: "Failed to load company profile." });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const body = UpdateCompanyProfileBody.parse(req.body);
    const { db, companyProfilesTable } = await getDbModule();

    const [profile] = await db
      .update(companyProfilesTable)
      .set({
        companyName: body.companyName ?? undefined,
        contactName: body.contactName ?? undefined,
        orgNumber: body.orgNumber ?? undefined,
        email: body.email ?? undefined,
        phone: body.phone ?? undefined,
        address: body.address ?? undefined,
        postalCode: body.postalCode ?? undefined,
        city: body.city ?? undefined,
        website: body.website ?? undefined,
        logoUrl: body.logoUrl ?? undefined,
        defaultCurrency: body.defaultCurrency ?? undefined,
        defaultTaxRate:
          body.defaultTaxRate !== undefined
            ? body.defaultTaxRate.toString()
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(companyProfilesTable.workspaceId, req.auth!.workspaceId))
      .returning();

    if (!profile) {
      res.status(404).json({ error: "Company profile not found." });
      return;
    }

    res.json(CompanyProfileSchema.parse(serializeCompanyProfile(profile)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update company profile");
    res.status(500).json({ error: "Failed to update company profile." });
  }
});

export default router;
