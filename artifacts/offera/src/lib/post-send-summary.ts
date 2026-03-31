import type { ProposalStatus } from "@workspace/api-zod";

export const POST_SEND_SUMMARY_STORAGE_KEY = "offera.post-send-summary";

export type PostSendSummaryPayload = {
  proposalId: number;
  title: string;
  clientName?: string;
  clientEmail?: string;
  publicSlug: string;
  status: ProposalStatus;
  updatedAt: string;
};

export function savePostSendSummary(payload: PostSendSummaryPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    POST_SEND_SUMMARY_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function consumePostSendSummary(): PostSendSummaryPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(POST_SEND_SUMMARY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(POST_SEND_SUMMARY_STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw) as PostSendSummaryPayload;
    if (
      typeof parsed.proposalId !== "number" ||
      typeof parsed.title !== "string" ||
      typeof parsed.publicSlug !== "string" ||
      typeof parsed.status !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildPublicProposalUrl(publicSlug: string) {
  const basePath = import.meta.env.BASE_URL || "/";

  if (typeof window === "undefined") {
    return `${basePath.replace(/\/$/, "")}/p/${publicSlug}`;
  }

  return new URL(
    `p/${publicSlug}`,
    `${window.location.origin}${basePath.replace(/\/?$/, "/")}`,
  ).toString();
}
