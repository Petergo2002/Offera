import { createHash, randomBytes } from "node:crypto";

const DEFAULT_TOKEN_TTL_YEARS = 50;

export function normalizeEmail(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function createSigningToken() {
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = hashSigningToken(rawToken);

  return { rawToken, tokenHash };
}

export function hashSigningToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSigningTokenExpiry(now = new Date()) {
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + DEFAULT_TOKEN_TTL_YEARS);
  return expiry;
}

export function requireAppOrigin() {
  const appOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");

  if (!appOrigin) {
    throw new Error("APP_ORIGIN must be set to send signing emails.");
  }

  return appOrigin;
}

export function buildSigningLink(appOrigin: string, slug: string, rawToken: string) {
  const url = new URL(`${appOrigin}/p/${slug}`);
  url.searchParams.set("token", rawToken);
  return url.toString();
}
