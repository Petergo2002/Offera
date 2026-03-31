import { createHash } from "node:crypto";
import type {
  ProposalAcceptanceEvidence,
  ProposalParties,
  ProposalRevisionSnapshot,
} from "@workspace/db/schema";
import { normalizeProposalSections } from "./legacy-content";

type SnapshotInput = {
  proposalId: number;
  title: string;
  clientName: string;
  clientEmail?: string | null;
  totalValue: number | string;
  publicSlug: string;
  templateId?: number | null;
  sections: unknown;
  branding: unknown;
  parties: ProposalParties;
  personalMessage?: string | null;
  signingRecipientEmail: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date;
};

type RevisionLike = {
  id: number;
  status: string;
  snapshotHash: string;
  signingRecipientEmail: string;
  resendEmailId?: string | null;
  sentAt: Date;
  viewedAt?: Date | null;
  signedAt?: Date | null;
  declinedAt?: Date | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signerInitials?: string | null;
  signatureDataUrl?: string | null;
  acceptanceEvidence?: ProposalAcceptanceEvidence | null;
};

function normalizeForCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForCanonicalJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, innerValue]) => [key, normalizeForCanonicalJson(innerValue)]),
    );
  }

  return value;
}

export function canonicalizeJson(value: unknown) {
  return JSON.stringify(normalizeForCanonicalJson(value));
}

export function hashProposalSnapshot(snapshot: ProposalRevisionSnapshot) {
  return createHash("sha256")
    .update(canonicalizeJson(snapshot))
    .digest("hex");
}

export function buildProposalRevisionSnapshot(
  input: SnapshotInput,
): ProposalRevisionSnapshot {
  return {
    version: 1,
    proposalId: input.proposalId,
    title: input.title,
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    totalValue:
      typeof input.totalValue === "string"
        ? input.totalValue
        : input.totalValue.toString(),
    publicSlug: input.publicSlug,
    templateId: input.templateId ?? null,
    sections: normalizeProposalSections(input.sections),
    branding: structuredClone(input.branding),
    parties: structuredClone(input.parties),
    personalMessage: input.personalMessage ?? null,
    signingRecipientEmail: input.signingRecipientEmail,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
    sentAt: input.sentAt.toISOString(),
  };
}

export function buildPublicProposalFromRevision(
  snapshot: ProposalRevisionSnapshot,
  revision: RevisionLike,
) {
  const lastActivityAt =
    revision.signedAt ?? revision.declinedAt ?? revision.viewedAt ?? revision.sentAt;

  return {
    id: snapshot.proposalId,
    title: snapshot.title,
    clientName: snapshot.clientName,
    clientEmail: snapshot.clientEmail ?? undefined,
    status: revision.status,
    totalValue: Number(snapshot.totalValue),
    publicSlug: snapshot.publicSlug,
    templateId: snapshot.templateId ?? undefined,
    sections: normalizeProposalSections(snapshot.sections),
    branding: structuredClone(snapshot.branding),
    parties: structuredClone(snapshot.parties),
    personalMessage: snapshot.personalMessage ?? undefined,
    signedByName: revision.signerName ?? undefined,
    signatureInitials: revision.signerInitials ?? undefined,
    signatureDataUrl: revision.signatureDataUrl ?? undefined,
    signedAt: revision.signedAt?.toISOString(),
    createdAt: snapshot.createdAt,
    updatedAt: lastActivityAt.toISOString(),
    lastActivityAt: lastActivityAt.toISOString(),
    revisionId: revision.id,
    snapshotHash: revision.snapshotHash,
    sentAt: revision.sentAt.toISOString(),
    viewedAt: revision.viewedAt?.toISOString(),
    signingRecipientEmail: revision.signingRecipientEmail,
    resendEmailId: revision.resendEmailId ?? undefined,
  };
}
