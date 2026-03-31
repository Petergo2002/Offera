import { createRemoteJWKSet, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";
import { eq, sql } from "drizzle-orm";

export type AuthContext = {
  userId: string;
  email?: string;
  workspaceId: string;
};

type VerifiedJwtClaims = {
  sub?: string;
  email?: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function getSupabaseUrl() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL must be set for auth.",
    );
  }

  return url.replace(/\/$/, "");
}

const supabaseUrl = getSupabaseUrl();
const jwtIssuer = `${supabaseUrl}/auth/v1`;
const supabaseJwks = createRemoteJWKSet(
  new URL("/auth/v1/.well-known/jwks.json", `${supabaseUrl}/`),
);

function getBearerToken(req: Request) {
  const header = req.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function getDbModule() {
  const [{ db }, { companyProfilesTable, profilesTable, workspacesTable }] =
    await Promise.all([import("@workspace/db"), import("@workspace/db/schema")]);

  return {
    db,
    companyProfilesTable,
    profilesTable,
    workspacesTable,
  };
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, supabaseJwks, {
    issuer: jwtIssuer,
    audience: "authenticated",
  });

  return payload as VerifiedJwtClaims;
}

export async function resolveAuthContextFromToken(token: string) {
  const claims = await verifyAccessToken(token);
  const userId = claims.sub?.trim();

  if (!userId) {
    throw new Error("Access token is missing user id.");
  }

  const { db, profilesTable } = await getDbModule();
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));

  if (!profile?.workspaceId) {
    throw new Error("Authenticated user has no workspace profile.");
  }

  return {
    userId,
    email: claims.email?.trim() || undefined,
    workspaceId: profile.workspaceId,
  } satisfies AuthContext;
}

export async function ensureLegacyWorkspaceClaimed(workspaceId: string) {
  const { db } = await getDbModule();
  await db.execute(
    sql`select public.claim_legacy_workspace_data(${workspaceId}::uuid)`,
  );
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    req.auth = await resolveAuthContextFromToken(token);
    await ensureLegacyWorkspaceClaimed(req.auth.workspaceId);
    next();
  } catch (error) {
    req.log.warn({ err: error }, "Authentication failed");
    res.status(401).json({ error: "Invalid or expired session." });
  }
}

export async function getMePayload(auth: AuthContext) {
  const { db, companyProfilesTable, profilesTable, workspacesTable } =
    await getDbModule();

  await ensureLegacyWorkspaceClaimed(auth.workspaceId);

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, auth.userId));
  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, auth.workspaceId));
  const [companyProfile] = await db
    .select()
    .from(companyProfilesTable)
    .where(eq(companyProfilesTable.workspaceId, auth.workspaceId));

  if (!profile || !workspace || !companyProfile) {
    throw new Error("Authenticated user is missing bootstrap records.");
  }

  return {
    user: {
      id: auth.userId,
      email: auth.email,
    },
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName ?? undefined,
      workspaceId: profile.workspaceId,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    workspace: {
      id: workspace.id,
      ownerUserId: workspace.ownerUserId,
      name: workspace.name,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    },
    companyProfile: {
      workspaceId: companyProfile.workspaceId,
      companyName: companyProfile.companyName,
      contactName: companyProfile.contactName,
      orgNumber: companyProfile.orgNumber,
      email: companyProfile.email,
      phone: companyProfile.phone,
      address: companyProfile.address,
      postalCode: companyProfile.postalCode,
      city: companyProfile.city,
      website: companyProfile.website,
      logoUrl: companyProfile.logoUrl ?? undefined,
      defaultCurrency: companyProfile.defaultCurrency,
      defaultTaxRate: Number(companyProfile.defaultTaxRate),
      createdAt: companyProfile.createdAt,
      updatedAt: companyProfile.updatedAt,
    },
  };
}
