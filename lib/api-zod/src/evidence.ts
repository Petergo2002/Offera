import { z } from "zod";
import { MeResponse } from "./auth";
import { GetProposalResponse } from "./generated/api";

export const ProposalEvidenceRevisionSchema = z.object({
  id: z.number(),
  revisionNumber: z.number(),
  status: z.string(),
  snapshotHash: z.string(),
  signingRecipientEmail: z.string(),
  resendEmailId: z.string().optional(),
  sentAt: z.coerce.date(),
  viewedAt: z.coerce.date().optional(),
  signedAt: z.coerce.date().optional(),
  declinedAt: z.coerce.date().optional(),
  signerName: z.string().optional(),
  signerEmail: z.string().optional(),
  signerInitials: z.string().optional(),
  signatureDataUrl: z.string().optional(),
  acceptanceEvidence: z
    .object({
      signerName: z.string().optional(),
      signerEmail: z.string().optional(),
      initials: z.string().optional(),
      signatureDataUrl: z.string().optional(),
      termsAccepted: z.boolean().optional(),
      consentAcceptedAt: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
  tamperedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  snapshot: z.object({
    version: z.number(),
    proposalId: z.number(),
    title: z.string(),
    clientName: z.string(),
    clientEmail: z.string().nullable().optional(),
    totalValue: z.string(),
    publicSlug: z.string(),
    templateId: z.number().nullable().optional(),
    sections: z.array(z.unknown()),
    branding: z.unknown(),
    parties: GetProposalResponse.shape.parties,
    personalMessage: z.string().nullable().optional(),
    signingRecipientEmail: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    sentAt: z.string(),
  }),
});

export const ProposalEvidenceAuditEventSchema = z.object({
  id: z.number(),
  revisionId: z.number().optional(),
  eventType: z.string(),
  actorType: z.string(),
  actorEmail: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
});

export const ProposalEvidenceSigningTokenSchema = z.object({
  id: z.number(),
  recipientEmail: z.string(),
  emailId: z.string().optional(),
  expiresAt: z.coerce.date(),
  usedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
});

export const ProposalEvidenceResponse = z.object({
  proposal: GetProposalResponse,
  activeRevision: ProposalEvidenceRevisionSchema.optional(),
  auditEvents: z.array(ProposalEvidenceAuditEventSchema),
  signingTokens: z.array(ProposalEvidenceSigningTokenSchema),
  generatedAt: z.coerce.date(),
  exportedBy: MeResponse.shape.user,
});

export type ProposalEvidence = z.infer<typeof ProposalEvidenceResponse>;
