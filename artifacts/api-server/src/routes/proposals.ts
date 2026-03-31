import { randomBytes } from "crypto";
import { Router, type IRouter, type Request } from "express";
import { and, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import {
  CreateProposalBody,
  ProposalEvidenceResponse,
  SendProposalBody,
  RespondToProposalBody,
  UpdateProposalBody,
} from "@workspace/api-zod";
import {
  createProposal as createLocalProposal,
  deleteProposal as deleteLocalProposal,
  getProposalById as getLocalProposalById,
  getPublicProposal as getLocalPublicProposal,
  listProposals as listLocalProposals,
  makeDefaultSections,
  respondToProposal as respondToLocalProposal,
  sendProposal as sendLocalProposal,
  updateProposal as updateLocalProposal,
} from "../lib/local-store.js";
import {
  normalizeProposalParties,
  type ProposalAuditActorType,
  type ProposalAuditEventType,
  type ProposalAcceptanceEvidence,
  type ProposalParties,
  type ProposalRevisionSnapshot,
} from "@workspace/db/schema";
import {
  buildProposalRevisionSnapshot,
  buildPublicProposalFromRevision,
  hashProposalSnapshot,
} from "../lib/proposal-evidence.js";
import {
  buildSigningLink,
  createSigningToken,
  createSigningTokenExpiry,
  hashSigningToken,
  normalizeEmail,
  requireAppOrigin,
} from "../lib/proposal-signing.js";
import { requireResendFromEmail, sendEmail } from "../lib/resend.js";
import { requireAuth, resolveAuthContextFromToken } from "../lib/auth.js";
import { normalizeProposalSections } from "../lib/legacy-content.js";

const router: IRouter = Router();
const hasDatabase = Boolean(process.env.DATABASE_URL);
const MAX_SIGNATURE_DATA_URL_LENGTH = 500_000;
const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,[a-z0-9+/=]+$/i;

router.use((req, res, next) => {
  if (req.path.startsWith("/public/")) {
    next();
    return;
  }

  void requireAuth(req, res, next);
});

type ProposalRecord = {
  id: number;
  workspaceId?: string | null;
  title: string;
  clientName: string;
  clientEmail?: string | null;
  status: string;
  totalValue: number | string;
  publicSlug: string;
  templateId?: number | null;
  activeRevisionId?: number | null;
  sections: unknown;
  branding: unknown;
  parties?: ProposalParties | null;
  personalMessage?: string | null;
  signedByName?: string | null;
  signatureInitials?: string | null;
  signatureDataUrl?: string | null;
  acceptanceEvidence?: ProposalAcceptanceEvidence | null;
  signedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date | null;
};

type ProposalRevisionRecord = {
  id: number;
  workspaceId?: string | null;
  proposalId: number;
  revisionNumber: number;
  status: string;
  snapshot: unknown;
  snapshotHash: string;
  signingRecipientEmail: string;
  resendEmailId?: string | null;
  isActive: boolean;
  sentAt: Date;
  viewedAt?: Date | null;
  signedAt?: Date | null;
  declinedAt?: Date | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signerInitials?: string | null;
  signatureDataUrl?: string | null;
  acceptanceEvidence?: ProposalAcceptanceEvidence | null;
  tamperedAt?: Date | null;
  createdAt: Date;
};

type ProposalAuditEventRecord = {
  id: number;
  workspaceId?: string | null;
  proposalId: number;
  revisionId?: number | null;
  eventType: string;
  actorType: string;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

type ProposalSigningTokenRecord = {
  id: number;
  workspaceId?: string | null;
  proposalId: number;
  revisionId?: number | null;
  recipientEmail: string;
  tokenHash: string;
  emailId?: string | null;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
};

type ProposalAuditSummary = {
  eventCount: number;
  lastEventAt?: string;
  lastEventType?: string;
};

type AcceptanceCapture = {
  signerEmail: string;
  signedByName: string;
  signatureInitials: string;
  signatureDataUrl: string;
  signedAt: Date;
  acceptanceEvidence: ProposalAcceptanceEvidence;
};

function generateSlug(): string {
  return randomBytes(5).toString("hex");
}

function getBearerToken(req: Request) {
  const header = req.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function attachOptionalAuth(req: Request) {
  if (req.auth) {
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    return;
  }

  try {
    req.auth = await resolveAuthContextFromToken(token);
  } catch (error) {
    req.log.debug({ err: error }, "Ignoring invalid bearer token on public route");
  }
}

function isWorkspaceProposalViewer(
  req: Request,
  proposal: Pick<ProposalRecord, "workspaceId">,
) {
  return Boolean(
    req.auth?.workspaceId &&
      proposal.workspaceId &&
      req.auth.workspaceId === proposal.workspaceId,
  );
}

function toPublicProposalView<
  T extends {
    id: number;
    title: string;
    clientName: string;
    clientEmail?: string;
    status: string;
    totalValue: number;
    publicSlug: string;
    templateId?: number;
    sections: unknown;
    branding: unknown;
    parties: unknown;
    personalMessage?: string;
    signedByName?: string;
    signatureInitials?: string;
    signedAt?: string;
    createdAt: string;
    updatedAt: string;
    lastActivityAt?: string;
  },
>(proposal: T) {
  return {
    id: proposal.id,
    title: proposal.title,
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    status: proposal.status,
    totalValue: proposal.totalValue,
    publicSlug: proposal.publicSlug,
    templateId: proposal.templateId,
    sections: proposal.sections,
    branding: proposal.branding,
    parties: proposal.parties,
    personalMessage: proposal.personalMessage,
    signedByName: proposal.signedByName,
    signatureInitials: proposal.signatureInitials,
    signedAt: proposal.signedAt,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    lastActivityAt: proposal.lastActivityAt,
  };
}

async function findPublicViewSigningToken(
  dbModule: Awaited<ReturnType<typeof getDbModule>>,
  proposalId: number,
  activeRevisionId: number,
  rawToken: string,
) {
  const tokenHash = hashSigningToken(rawToken.trim());
  const [signingToken] = await dbModule.db
    .select()
    .from(dbModule.proposalSigningTokensTable)
    .where(
      and(
        eq(dbModule.proposalSigningTokensTable.proposalId, proposalId),
        eq(dbModule.proposalSigningTokensTable.revisionId, activeRevisionId),
        eq(dbModule.proposalSigningTokensTable.tokenHash, tokenHash),
      ),
    );

  return signingToken as ProposalSigningTokenRecord | undefined;
}

async function getDbModule() {
  const [
    { db },
    {
      proposalAuditEventsTable,
      proposalRevisionsTable,
      proposalSigningTokensTable,
      proposalsTable,
      templatesTable,
    },
  ] =
    await Promise.all([
      import("@workspace/db"),
      import("@workspace/db/schema"),
    ]);

  return {
    db,
    proposalAuditEventsTable,
    proposalRevisionsTable,
    proposalSigningTokensTable,
    proposalsTable,
    templatesTable,
  };
}

function serializeProposal(
  p: ProposalRecord,
  options?: {
    activeRevision?: ProposalRevisionRecord | null;
    auditSummary?: ProposalAuditSummary;
  },
) {
  const parties = normalizeProposalParties(
    p.parties,
    p.clientName,
    p.clientEmail,
  );

  return {
    id: p.id,
    title: p.title,
    clientName: parties.recipient.companyName,
    clientEmail: parties.recipient.email || undefined,
    status: p.status,
    totalValue:
      typeof p.totalValue === "string" ? Number(p.totalValue) : p.totalValue,
    publicSlug: p.publicSlug,
    templateId: p.templateId ?? undefined,
    sections: normalizeProposalSections(p.sections),
    branding: p.branding as unknown,
    parties,
    personalMessage: p.personalMessage ?? undefined,
    signedByName: p.signedByName ?? undefined,
    signatureInitials: p.signatureInitials ?? undefined,
    signatureDataUrl: p.signatureDataUrl ?? undefined,
    signedAt: p.signedAt ? p.signedAt.toISOString() : undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    lastActivityAt: p.lastActivityAt?.toISOString(),
    revisionId: options?.activeRevision?.id,
    snapshotHash: options?.activeRevision?.snapshotHash,
    sentAt: options?.activeRevision?.sentAt?.toISOString(),
    viewedAt: options?.activeRevision?.viewedAt?.toISOString(),
    signingRecipientEmail: options?.activeRevision?.signingRecipientEmail,
    resendEmailId: options?.activeRevision?.resendEmailId ?? undefined,
    auditSummary: options?.auditSummary,
  };
}

function serializeProposalRevision(revision: ProposalRevisionRecord) {
  const snapshot = getRevisionSnapshot(revision);

  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    status: revision.status,
    snapshotHash: revision.snapshotHash,
    signingRecipientEmail: revision.signingRecipientEmail,
    resendEmailId: revision.resendEmailId ?? undefined,
    sentAt: revision.sentAt.toISOString(),
    viewedAt: revision.viewedAt?.toISOString(),
    signedAt: revision.signedAt?.toISOString(),
    declinedAt: revision.declinedAt?.toISOString(),
    signerName: revision.signerName ?? undefined,
    signerEmail: revision.signerEmail ?? undefined,
    signerInitials: revision.signerInitials ?? undefined,
    signatureDataUrl: revision.signatureDataUrl ?? undefined,
    acceptanceEvidence: revision.acceptanceEvidence ?? undefined,
    tamperedAt: revision.tamperedAt?.toISOString(),
    createdAt: revision.createdAt.toISOString(),
    snapshot: {
      ...snapshot,
      sections: normalizeProposalSections(snapshot.sections),
    },
  };
}

function serializeProposalAuditEvent(event: ProposalAuditEventRecord) {
  return {
    id: event.id,
    revisionId: event.revisionId ?? undefined,
    eventType: event.eventType,
    actorType: event.actorType,
    actorEmail: event.actorEmail ?? undefined,
    ipAddress: event.ipAddress ?? undefined,
    userAgent: event.userAgent ?? undefined,
    metadata: event.metadata ?? {},
    createdAt: event.createdAt.toISOString(),
  };
}

function serializeSigningToken(token: {
  id: number;
  recipientEmail: string;
  emailId?: string | null;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: token.id,
    recipientEmail: token.recipientEmail,
    emailId: token.emailId ?? undefined,
    expiresAt: token.expiresAt.toISOString(),
    usedAt: token.usedAt?.toISOString(),
    createdAt: token.createdAt.toISOString(),
  };
}

function buildAuditSummary(
  events: ProposalAuditEventRecord[],
): ProposalAuditSummary | undefined {
  if (events.length === 0) {
    return undefined;
  }

  const [lastEvent] = events
    .slice()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return {
    eventCount: events.length,
    lastEventAt: lastEvent.createdAt.toISOString(),
    lastEventType: lastEvent.eventType,
  };
}

function buildProposalParties(
  currentParties: ProposalParties | null | undefined,
  updates: {
    parties?: ProposalParties;
    clientName?: string;
    clientEmail?: string;
  },
): ProposalParties {
  const nextParties = normalizeProposalParties(
    updates.parties ?? currentParties,
    updates.clientName,
    updates.clientEmail,
  );

  if (updates.clientName !== undefined) {
    nextParties.recipient.companyName = updates.clientName;
  }

  if (updates.clientEmail !== undefined) {
    nextParties.recipient.email = updates.clientEmail;
  }

  return nextParties;
}

function normalizeSignerName(name: string | undefined): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

function normalizeInitials(initials: string | undefined): string {
  return (initials ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 5);
}

function getProposalRecipientEmail(proposal: ProposalRecord): string {
  return normalizeEmail(proposal.parties?.recipient.email ?? proposal.clientEmail);
}

function getProposalSenderEmail(proposal: ProposalRecord): string {
  return normalizeEmail(proposal.parties?.sender.email);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEmailDisplayName(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.replace(/["<>]/g, "").trim();
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function isUsableEmailAddress(value: string | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function formatEmailIdentity(addressOrIdentity: string, displayName?: string) {
  const address = extractEmailAddress(addressOrIdentity);
  const safeDisplayName = displayName
    ? normalizeEmailDisplayName(displayName)
    : "";

  if (!safeDisplayName) {
    return addressOrIdentity.trim();
  }

  return `${safeDisplayName} <${address}>`;
}

function getProposalSenderDisplayName(proposal: ProposalRecord) {
  const sender = proposal.parties?.sender;
  return (
    normalizeEmailDisplayName(sender?.companyName ?? "") ||
    normalizeEmailDisplayName(sender?.contactName ?? "") ||
    "Offera"
  );
}

function getProposalRecipientDisplayName(proposal: ProposalRecord) {
  const recipient = proposal.parties?.recipient;
  return (
    normalizeEmailDisplayName(recipient?.contactName ?? "") ||
    normalizeEmailDisplayName(recipient?.companyName ?? "") ||
    "dig"
  );
}

function getProposalAccentColor(proposal: { branding: unknown }) {
  const branding = proposal.branding as Record<string, unknown> | null | undefined;
  const accentColor =
    typeof branding?.accentColor === "string"
    ? branding.accentColor.trim()
    : "";

  return /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : "#111827";
}

function getProposalLogoUrl(proposal: { branding: unknown }) {
  const branding = proposal.branding as Record<string, unknown> | null | undefined;
  return typeof branding?.logoUrl === "string" ? branding.logoUrl : undefined;
}

function buildSigningEmail({
  proposalTitle,
  recipientName,
  senderDisplayName,
  senderEmail,
  accentColor,
  logoUrl,
  personalMessage,
  signingLink,
}: {
  proposalTitle: string;
  recipientName: string;
  senderDisplayName: string;
  senderEmail?: string;
  accentColor: string;
  logoUrl?: string;
  personalMessage?: string | null;
  signingLink: string;
}) {
  const escapedTitle = escapeHtml(proposalTitle || "Offert");
  const escapedRecipient = escapeHtml(recipientName || "dig");
  const escapedSender = escapeHtml(senderDisplayName || "Offera");
  const escapedSigningLink = escapeHtml(signingLink);
  const escapedAccentColor = escapeHtml(accentColor);
  const trimmedMessage = personalMessage?.trim();

  const logoHtml = logoUrl
    ? `
        <tr>
          <td align="center" style="padding: 40px 0 20px;">
            <img src="${escapeHtml(logoUrl)}" alt="${escapedSender}" style="max-height: 48px; width: auto; display: block; margin: 0 auto; outline: none; border: none; -ms-interpolation-mode: bicubic;">
          </td>
        </tr>
      `
    : `
        <tr>
          <td align="center" style="padding: 40px 0 20px;">
            <div style="font-family:'Inter', -apple-system, sans-serif; font-size: 18px; font-weight: 700; color: #111827;">${escapedSender}</div>
          </td>
        </tr>
      `;

  const messageHtml = trimmedMessage
    ? `
        <tr>
          <td style="padding: 0 32px 32px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; color: #475569; font-family:'Inter', -apple-system, sans-serif; font-size: 15px; line-height: 1.6;">
              ${escapeHtml(trimmedMessage)}
            </div>
          </td>
        </tr>
      `
    : "";

  const replyLine = senderEmail
    ? `Om du har frågor kan du svara direkt på det här mejlet eller kontakta <a href="mailto:${senderEmail}" style="color: ${escapedAccentColor}; text-decoration: none; font-weight: 500;">${senderEmail}</a>.`
    : "Om du har frågor kan du svara direkt på det här mejlet.";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapedTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
              ${logoHtml}
              <tr>
                <td style="padding: 10px 32px 10px; text-align: center;">
                  <div style="display: inline-block; background: ${escapedAccentColor}15; color: ${escapedAccentColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 6px 12px; border-radius: 100px;">
                    Offert för signering
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px 32px; text-align: center;">
                  <h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 800; color: #0F172A; text-align: center; line-height: 1.2;">${escapedTitle}</h1>
                  <p style="margin: 0 auto; max-width: 440px; font-size: 18px; line-height: 1.6; color: #475569; text-align: center;">
                    Hej ${escapedRecipient}, ${escapedSender} har skickat en offert till dig. Klicka på knappen nedan för att granska och signera digitalt.
                  </p>
                </td>
              </tr>
              ${messageHtml}
              <tr>
                <td align="center" style="padding: 0 32px 40px;">
                  <a href="${escapedSigningLink}" style="display: inline-block; background-color: ${escapedAccentColor}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 18px 36px; border-radius: 14px; box-shadow: 0 4px 6px -1px ${escapedAccentColor}40;">
                    Granska och signera
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                  <div style="font-size: 14px; line-height: 1.6; color: #64748B; text-align: center;">
                    <p style="margin: 0 0 12px;">Länken är personlig och gäller i 30 minuter.</p>
                    <p style="margin: 0;">${replyLine}</p>
                  </div>
                  <div style="margin-top: 24px; padding-top: 24px; border-top: 1px dashed #CBD5E1; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Fungerar inte knappen?</p>
                    <div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; font-size: 12px; color: #475569; word-break: break-all;">
                      ${escapedSigningLink}
                    </div>
                  </div>
                </td>
              </tr>
            </table>
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin-top: 24px;">
              <tr>
                <td align="center" style="color: #94A3B8; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} ${escapedSender}. Alla rättigheter förbehållna.<br>
                  Säker digital signering drivs av <a href="https://offera.se" style="color: #64748B; text-decoration: underline; font-weight: 500;">Offera</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return {
    subject: `Offert från ${senderDisplayName} väntar på signering`,
    html,
    text: [
      `Hej ${recipientName || "dig"},`,
      "",
      `${senderDisplayName} har skickat en offert till dig som väntar på signering.`,
      `Titel: ${proposalTitle || "Offert"}`,
      "",
      trimmedMessage ? `Meddelande: ${trimmedMessage}` : "",
      "",
      "Öppna länken nedan för att granska och signera:",
      signingLink,
      "",
      "Länken är personlig och gäller i 30 minuter.",
      senderEmail ? `Svara direkt på detta mejl eller kontakta ${senderEmail}.` : "Svara direkt på detta mejl för frågor.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildSignedConfirmationEmail({
  proposalTitle,
  recipientName,
  senderDisplayName,
  signedAt,
  snapshotHash,
  documentLink,
  logoUrl,
  accentColor,
}: {
  proposalTitle: string;
  recipientName: string;
  senderDisplayName: string;
  signedAt: Date;
  snapshotHash: string;
  documentLink: string;
  logoUrl?: string;
  accentColor: string;
}) {
  const escapedTitle = escapeHtml(proposalTitle || "Offert");
  const escapedRecipient = escapeHtml(recipientName || "mottagaren");
  const escapedSender = escapeHtml(senderDisplayName || "Offera");
  const escapedSnapshotHash = escapeHtml(snapshotHash);
  const escapedDocumentLink = escapeHtml(documentLink);
  const escapedAccentColor = escapeHtml(accentColor);

  const logoHtml = logoUrl
    ? `
        <tr>
          <td align="center" style="padding: 40px 0 20px;">
            <img src="${escapeHtml(logoUrl)}" alt="${escapedSender}" style="max-height: 48px; width: auto; display: block; margin: 0 auto; outline: none; border: none; -ms-interpolation-mode: bicubic;">
          </td>
        </tr>
      `
    : `
        <tr>
          <td align="center" style="padding: 40px 0 20px;">
            <div style="font-family:'Inter', -apple-system, sans-serif; font-size: 18px; font-weight: 700; color: #111827;">${escapedSender}</div>
          </td>
        </tr>
      `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapedTitle} Signerad</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
              ${logoHtml}
              <tr>
                <td style="padding: 10px 32px 10px; text-align: center;">
                  <div style="display: inline-block; background: #22C55E15; color: #16A34A; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 6px 12px; border-radius: 100px;">
                    Signerad och Klar
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px 16px; text-align: center;">
                  <h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 800; color: #0F172A; text-align: center; line-height: 1.2;">${escapedTitle}</h1>
                  <p style="margin: 0 auto; max-width: 440px; font-size: 18px; line-height: 1.6; color: #475569; text-align: center;">
                    Offerten har signerats digitalt och är nu juridiskt bindande. En kopia finns tillgänglig för båda parter.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; padding: 24px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Signerad den</div>
                          <div style="font-size: 15px; color: #0F172A; font-weight: 500;">${escapeHtml(signedAt.toLocaleString("sv-SE"))}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 16px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Signerad av</div>
                          <div style="font-size: 15px; color: #0F172A; font-weight: 500;">${escapedRecipient}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid #E2E8F0; padding-top: 16px;">
                          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Fingeravtryck (SHA-256)</div>
                          <div style="font-size: 12px; color: #64748B; font-family: monospace; word-break: break-all; background: #F1F5F9; padding: 8px; border-radius: 8px;">${escapedSnapshotHash}</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 32px 40px;">
                  <a href="${escapedDocumentLink}" style="display: inline-block; background-color: #111827; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 18px 36px; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    Visa det signerade dokumentet
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
                  <div style="font-size: 14px; line-height: 1.6; color: #64748B;">
                    Det här är en automatisk bekräftelse. Behåll det här mejlet som ett kvitto på din signering.
                  </div>
                </td>
              </tr>
            </table>
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin-top: 24px;">
              <tr>
                <td align="center" style="color: #94A3B8; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} ${escapedSender}. Alla rättigheter förbehållna.<br>
                  Säker digital signering via <a href="https://offera.se" style="color: #64748B; text-decoration: underline; font-weight: 500;">Offera</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return {
    subject: `${proposalTitle || "Offert"} är signerad`,
    html,
    text: [
      `${proposalTitle || "Offert"} är signerad.`,
      "",
      `Mottagare: ${recipientName || "mottagaren"}`,
      `Signerad: ${signedAt.toISOString()}`,
      `Dokumentfingerprint: ${snapshotHash}`,
      `Offertlänk: ${documentLink}`,
    ].join("\n"),
  };
}

function getRequestMetadata(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : req.ip || undefined;

  return {
    ipAddress,
    userAgent: req.get("user-agent") || undefined,
  };
}

function getRevisionSnapshot(
  revision: ProposalRevisionRecord,
): ProposalRevisionSnapshot {
  return revision.snapshot as ProposalRevisionSnapshot;
}

function verifyRevisionIntegrity(revision: ProposalRevisionRecord) {
  const snapshot = getRevisionSnapshot(revision);
  const calculatedHash = hashProposalSnapshot(snapshot);

  return {
    snapshot,
    isValid: calculatedHash === revision.snapshotHash,
    calculatedHash,
  };
}

async function logProposalAuditEvent(
  db: Awaited<ReturnType<typeof getDbModule>>["db"],
  proposalAuditEventsTable: Awaited<
    ReturnType<typeof getDbModule>
  >["proposalAuditEventsTable"],
  input: {
    workspaceId?: string | null;
    proposalId: number;
    revisionId?: number | null;
    eventType: ProposalAuditEventType;
    actorType: ProposalAuditActorType;
    actorEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(proposalAuditEventsTable).values({
    workspaceId: input.workspaceId ?? null,
    proposalId: input.proposalId,
    revisionId: input.revisionId ?? null,
    eventType: input.eventType,
    actorType: input.actorType,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });
}

async function loadActiveRevisionMap(
  proposalIds: number[],
  dbModule: Awaited<ReturnType<typeof getDbModule>>,
) {
  if (proposalIds.length === 0) {
    return new Map<number, ProposalRevisionRecord>();
  }

  const revisions = await dbModule.db
    .select()
    .from(dbModule.proposalRevisionsTable)
    .where(
      and(
        inArray(dbModule.proposalRevisionsTable.proposalId, proposalIds),
        eq(dbModule.proposalRevisionsTable.isActive, true),
      ),
    );

  return new Map(
    revisions.map((revision) => [
      revision.proposalId,
      revision as ProposalRevisionRecord,
    ]),
  );
}

async function loadAuditSummaryMap(
  proposalIds: number[],
  dbModule: Awaited<ReturnType<typeof getDbModule>>,
) {
  if (proposalIds.length === 0) {
    return new Map<number, ProposalAuditSummary>();
  }

  const events = await dbModule.db
    .select()
    .from(dbModule.proposalAuditEventsTable)
    .where(inArray(dbModule.proposalAuditEventsTable.proposalId, proposalIds));

  const grouped = new Map<number, ProposalAuditEventRecord[]>();
  for (const event of events as ProposalAuditEventRecord[]) {
    const bucket = grouped.get(event.proposalId) ?? [];
    bucket.push(event);
    grouped.set(event.proposalId, bucket);
  }

  return new Map(
    Array.from(grouped.entries()).map(([proposalId, groupedEvents]) => [
      proposalId,
      buildAuditSummary(groupedEvents),
    ]),
  );
}

async function ensureActiveRevisionForProposal(
  proposal: ProposalRecord,
  dbModule: Awaited<ReturnType<typeof getDbModule>>,
) {
  if (proposal.activeRevisionId) {
    const [activeRevision] = await dbModule.db
      .select()
      .from(dbModule.proposalRevisionsTable)
      .where(eq(dbModule.proposalRevisionsTable.id, proposal.activeRevisionId));

    if (activeRevision) {
      return activeRevision as ProposalRevisionRecord;
    }
  }

  if (proposal.status === "draft") {
    return null;
  }

  const recipientEmail = getProposalRecipientEmail(proposal);
  if (!recipientEmail) {
    return null;
  }

  const sentAt = proposal.updatedAt ?? new Date();
  const snapshot = buildProposalRevisionSnapshot({
    proposalId: proposal.id,
    title: proposal.title,
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail ?? null,
    totalValue: proposal.totalValue,
    publicSlug: proposal.publicSlug,
    templateId: proposal.templateId ?? null,
    sections: proposal.sections,
    branding: proposal.branding,
    parties: normalizeProposalParties(
      proposal.parties,
      proposal.clientName,
      proposal.clientEmail,
    ),
    personalMessage: proposal.personalMessage ?? null,
    signingRecipientEmail: recipientEmail,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    sentAt,
  });

  const [createdRevision] = await dbModule.db
    .insert(dbModule.proposalRevisionsTable)
    .values({
      workspaceId: proposal.workspaceId ?? null,
      proposalId: proposal.id,
      revisionNumber: 1,
      status: proposal.status,
      snapshot,
      snapshotHash: hashProposalSnapshot(snapshot),
      signingRecipientEmail: recipientEmail,
      isActive: true,
      sentAt,
      viewedAt: proposal.status === "viewed" ? proposal.lastActivityAt ?? sentAt : null,
      signedAt: proposal.signedAt ?? null,
      declinedAt:
        proposal.status === "declined" ? proposal.lastActivityAt ?? sentAt : null,
      signerName: proposal.signedByName ?? null,
      signerEmail: proposal.acceptanceEvidence?.signerEmail ?? null,
      signerInitials: proposal.signatureInitials ?? null,
      signatureDataUrl: proposal.signatureDataUrl ?? null,
      acceptanceEvidence: proposal.acceptanceEvidence ?? null,
    })
    .returning();

  await dbModule.db
    .update(dbModule.proposalsTable)
    .set({ activeRevisionId: createdRevision.id })
    .where(eq(dbModule.proposalsTable.id, proposal.id));

  await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
    workspaceId: proposal.workspaceId ?? null,
    proposalId: proposal.id,
    revisionId: createdRevision.id,
    eventType: "new_revision_created",
    actorType: "system",
    actorEmail: undefined,
    metadata: {
      reason: "legacy_backfill",
      snapshotHash: createdRevision.snapshotHash,
    },
  });

  return createdRevision as ProposalRevisionRecord;
}

function buildAcceptanceCapture(
  req: Request,
  body: typeof RespondToProposalBody._type,
  signerEmail: string,
): { capture?: AcceptanceCapture; error?: string } {
  if (body.action !== "accept") {
    return {};
  }

  const normalizedSignerEmail = normalizeEmail(signerEmail);
  const signedByName = normalizeSignerName(body.signerName);
  const signatureInitials = normalizeInitials(body.initials);
  const signatureDataUrl = body.signatureDataUrl?.trim() ?? "";

  if (!normalizedSignerEmail) {
    return { error: "Mottagarens e-postadress kunde inte verifieras för signeringen." };
  }

  if (!signedByName) {
    return { error: "Signer name is required" };
  }

  if (!signatureInitials) {
    return { error: "Initials are required" };
  }

  if (!body.termsAccepted) {
    return { error: "Terms must be accepted" };
  }

  if (!signatureDataUrl) {
    return { error: "Signature is required" };
  }

  if (signatureDataUrl.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
    return { error: "Signature payload is too large" };
  }

  if (!PNG_DATA_URL_PATTERN.test(signatureDataUrl)) {
    return { error: "Signature must be a PNG data URL" };
  }

  const signedAt = new Date();
  const metadata = getRequestMetadata(req);

  return {
    capture: {
      signerEmail: normalizedSignerEmail,
      signedByName,
      signatureInitials,
      signatureDataUrl,
      signedAt,
      acceptanceEvidence: {
        signerName: signedByName,
        signerEmail: normalizedSignerEmail,
        initials: signatureInitials,
        signatureDataUrl,
        termsAccepted: true,
        consentAcceptedAt: signedAt.toISOString(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    },
  };
}

router.get("/", async (req, res) => {
  try {
    if (!hasDatabase) {
      const proposals = await listLocalProposals();
      res.json(proposals.map((proposal) => serializeProposal(proposal)));
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();
    const proposals = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(eq(dbModule.proposalsTable.workspaceId, workspaceId))
      .orderBy(dbModule.proposalsTable.updatedAt);
    const proposalIds = proposals.map((proposal) => proposal.id);
    const [activeRevisions, auditSummaries] = await Promise.all([
      loadActiveRevisionMap(proposalIds, dbModule),
      loadAuditSummaryMap(proposalIds, dbModule),
    ]);

    res.json(
      proposals.reverse().map((proposal) =>
        serializeProposal(proposal as ProposalRecord, {
          activeRevision: activeRevisions.get(proposal.id),
          auditSummary: auditSummaries.get(proposal.id),
        }),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list proposals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateProposalBody.parse(req.body);

    if (!hasDatabase) {
      const proposal = await createLocalProposal(body);
      res.status(201).json(serializeProposal(proposal));
      return;
    }

    const slug = generateSlug();
    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();

    let sections = makeDefaultSections();
    let branding: Record<string, unknown> = {
      accentColor: "#FF5C00",
      fontPairing: "modern",
      coverEnabled: true,
      coverBackground: "#0F172A",
      logoPosition: "left",
      dividerStyle: "line",
    };
    let templateId: number | null = null;

    if (body.templateId) {
      const [template] = await dbModule.db
        .select()
        .from(dbModule.templatesTable)
        .where(
          and(
            eq(dbModule.templatesTable.id, body.templateId),
            or(
              eq(dbModule.templatesTable.workspaceId, workspaceId),
              and(
                isNull(dbModule.templatesTable.workspaceId),
                eq(dbModule.templatesTable.isBuiltin, true),
              ),
            ),
          ),
        );

      if (template) {
        sections = normalizeProposalSections(template.sections);
        branding = template.designSettings as Record<string, unknown>;
        templateId = template.id;
      }
    }

    const [proposal] = await dbModule.db
      .insert(dbModule.proposalsTable)
      .values({
        workspaceId,
        title: body.title?.trim() || (templateId ? "Ny offert från mall" : "Ny offert"),
        clientName: body.clientName ?? "",
        clientEmail: body.clientEmail ?? null,
        status: "draft",
        publicSlug: slug,
        templateId,
        activeRevisionId: null,
        parties: buildProposalParties(undefined, {
          clientName: body.clientName ?? "",
          clientEmail: body.clientEmail ?? "",
        }) as typeof dbModule.proposalsTable.$inferInsert["parties"],
        sections:
          sections as unknown as typeof dbModule.proposalsTable.$inferInsert["sections"],
        branding:
          branding as unknown as typeof dbModule.proposalsTable.$inferInsert["branding"],
      })
      .returning();

    await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
      workspaceId,
      proposalId: proposal.id,
      eventType: "proposal_created",
      actorType: "sender",
      actorEmail: req.auth?.email,
      metadata: {
        status: proposal.status,
      },
    });

    res.status(201).json(serializeProposal(proposal as ProposalRecord));
  } catch (err) {
    req.log.error({ err }, "Failed to create proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const signingTokenParam =
      typeof req.query.signing_token === "string" ? req.query.signing_token.trim() : "";

    if (!hasDatabase) {
      const proposal = await getLocalPublicProposal(slug);
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }

      res.json(toPublicProposalView(serializeProposal(proposal)));
      return;
    }

    const dbModule = await getDbModule();
    const [proposal] = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(eq(dbModule.proposalsTable.publicSlug, slug));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    await attachOptionalAuth(req);
    const internalViewer = isWorkspaceProposalViewer(req, proposal as ProposalRecord);
    const activeRevision = await ensureActiveRevisionForProposal(
      proposal as ProposalRecord,
      dbModule,
    );

    if (!activeRevision) {
      if (!internalViewer) {
        res.status(403).json({
          error:
            "Den här offerten kräver en personlig signeringslänk eller en inloggad workspace-session för att visas.",
        });
        return;
      }

      res.json(toPublicProposalView(serializeProposal(proposal as ProposalRecord)));
      return;
    }

    let signingToken: ProposalSigningTokenRecord | undefined;
    if (!internalViewer) {
      if (!signingTokenParam) {
        res.status(403).json({
          error:
            "Den här offerten kräver den personliga länken från e-posten som skickades till motparten.",
        });
        return;
      }

      signingToken = await findPublicViewSigningToken(
        dbModule,
        proposal.id,
        activeRevision.id,
        signingTokenParam,
      );
      if (!signingToken) {
        res.status(403).json({
          error:
            "Signeringslänken är ogiltig eller matchar inte den aktuella dokumentversionen.",
        });
        return;
      }

      const isAwaitingResponse =
        activeRevision.status === "sent" || activeRevision.status === "viewed";
      if (
        isAwaitingResponse &&
        signingToken.expiresAt.getTime() <= Date.now()
      ) {
        res.status(403).json({
          error:
            "Signeringslänken har gått ut. Be avsändaren skicka en ny personlig länk.",
        });
        return;
      }

      if (
        normalizeEmail(signingToken.recipientEmail) !==
        normalizeEmail(activeRevision.signingRecipientEmail)
      ) {
        res.status(403).json({
          error: "Signeringslänken matchar inte längre den registrerade mottagaren.",
        });
        return;
      }
    }

    const integrity = verifyRevisionIntegrity(activeRevision);
    if (!integrity.isValid) {
      await dbModule.db
        .update(dbModule.proposalRevisionsTable)
        .set({ tamperedAt: new Date() })
        .where(eq(dbModule.proposalRevisionsTable.id, activeRevision.id));
      await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
        workspaceId: (proposal as ProposalRecord).workspaceId ?? null,
        proposalId: proposal.id,
        revisionId: activeRevision.id,
        eventType: "tamper_detected",
        actorType: "system",
        ipAddress: getRequestMetadata(req).ipAddress,
        userAgent: getRequestMetadata(req).userAgent,
        metadata: {
          expectedHash: activeRevision.snapshotHash,
          calculatedHash: integrity.calculatedHash,
        },
      });
      res.status(409).json({
        error:
          "Offerten kunde inte verifieras eftersom dokumentintegriteten inte längre stämmer.",
      });
      return;
    }

    let currentRevision = activeRevision;
    if (activeRevision.status === "sent" && !internalViewer) {
      const viewedAt = new Date();
      const [updatedRevision] = await dbModule.db
        .update(dbModule.proposalRevisionsTable)
        .set({
          status: "viewed",
          viewedAt,
        })
        .where(eq(dbModule.proposalRevisionsTable.id, activeRevision.id))
        .returning();

      await dbModule.db
        .update(dbModule.proposalsTable)
        .set({ status: "viewed", lastActivityAt: viewedAt, updatedAt: viewedAt })
        .where(eq(dbModule.proposalsTable.id, proposal.id));

      await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
        workspaceId: (proposal as ProposalRecord).workspaceId ?? null,
        proposalId: proposal.id,
        revisionId: activeRevision.id,
        eventType: signingToken ? "signing_link_opened" : "proposal_viewed",
        actorType: "recipient",
        actorEmail: activeRevision.signingRecipientEmail,
        ipAddress: getRequestMetadata(req).ipAddress,
        userAgent: getRequestMetadata(req).userAgent,
        metadata: {
          viaSigningLink: Boolean(signingToken),
        },
      });

      currentRevision = updatedRevision as ProposalRevisionRecord;
    }

    res.json(
      toPublicProposalView(
        buildPublicProposalFromRevision(
          integrity.snapshot,
          currentRevision,
        ),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get public proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/:slug/respond", async (req, res) => {
  try {
    const { slug } = req.params;
    const body = RespondToProposalBody.parse(req.body);

    if (!hasDatabase) {
      const proposal = await respondToLocalProposal(slug, {
        ...body,
      }, getRequestMetadata(req));
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }
      res.json(serializeProposal(proposal));
      return;
    }

    const dbModule = await getDbModule();
    const [proposal] = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(eq(dbModule.proposalsTable.publicSlug, slug));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const activeRevision = await ensureActiveRevisionForProposal(
      proposal as ProposalRecord,
      dbModule,
    );
    if (!activeRevision) {
      res.status(403).json({
        error:
          "Offerten har ingen låst signerbar version än. Skicka offerten igen innan den kan besvaras.",
      });
      return;
    }

    if (activeRevision.status !== "sent" && activeRevision.status !== "viewed") {
      res.status(409).json({
        error: "Offerten har redan besvarats och kan inte signeras eller avvisas igen.",
      });
      return;
    }

    const integrity = verifyRevisionIntegrity(activeRevision);
    if (!integrity.isValid) {
      await dbModule.db
        .update(dbModule.proposalRevisionsTable)
        .set({ tamperedAt: new Date() })
        .where(eq(dbModule.proposalRevisionsTable.id, activeRevision.id));
      await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
        workspaceId: (proposal as ProposalRecord).workspaceId ?? null,
        proposalId: proposal.id,
        revisionId: activeRevision.id,
        eventType: "tamper_detected",
        actorType: "system",
        ipAddress: getRequestMetadata(req).ipAddress,
        userAgent: getRequestMetadata(req).userAgent,
        metadata: {
          expectedHash: activeRevision.snapshotHash,
          calculatedHash: integrity.calculatedHash,
        },
      });
      res.status(409).json({
        error:
          "Offerten kunde inte verifieras eftersom dokumentintegriteten inte längre stämmer.",
      });
      return;
    }

    if (!body.signingToken?.trim()) {
      res.status(403).json({
        error:
          "Den här signeringen kräver den personliga länken från e-posten som skickades till motparten.",
      });
      return;
    }

    const tokenHash = hashSigningToken(body.signingToken.trim());
    const [signingToken] = await dbModule.db
      .select()
      .from(dbModule.proposalSigningTokensTable)
      .where(
        and(
          eq(dbModule.proposalSigningTokensTable.proposalId, proposal.id),
          eq(dbModule.proposalSigningTokensTable.tokenHash, tokenHash),
          isNull(dbModule.proposalSigningTokensTable.usedAt),
          gt(dbModule.proposalSigningTokensTable.expiresAt, new Date()),
        ),
      );

    if (!signingToken) {
      res.status(403).json({
        error:
          "Signeringslänken är ogiltig eller har gått ut. Skicka offerten igen för att få en ny länk.",
      });
      return;
    }

    if (
      signingToken.revisionId !== null &&
      signingToken.revisionId !== undefined &&
      signingToken.revisionId !== activeRevision.id
    ) {
      res.status(403).json({
        error:
          "Signeringslänken gäller inte längre för den senaste låsta versionen av offerten.",
      });
      return;
    }

    if (
      normalizeEmail(signingToken.recipientEmail) !==
      normalizeEmail(activeRevision.signingRecipientEmail)
    ) {
      res.status(403).json({
        error: "Signeringslänken matchar inte längre den registrerade mottagaren.",
      });
      return;
    }

    const normalizedSignerEmail =
      body.action === "accept"
        ? normalizeEmail(signingToken.recipientEmail)
        : undefined;

    if (body.action === "accept") {
      const recipientEmail = getProposalRecipientEmail(proposal as ProposalRecord);
      const senderEmail = getProposalSenderEmail(proposal as ProposalRecord);

      if (!recipientEmail) {
        res.status(403).json({
          error:
            "Offerten saknar mottagarens e-postadress. Ange motpartens e-post innan signering används.",
        });
        return;
      }

      if (!normalizedSignerEmail) {
        res.status(403).json({
          error:
            "Signeringslänken kunde inte verifiera mottagarens e-postadress. Skicka offerten igen för att skapa en ny personlig länk.",
        });
        return;
      }

      if (senderEmail && normalizedSignerEmail === senderEmail) {
        res.status(403).json({ error: "Avsändaren kan inte signera sin egen offert." });
        return;
      }

      if (normalizedSignerEmail !== recipientEmail) {
        res.status(403).json({
          error: "Endast den registrerade mottagaren kan signera offerten.",
        });
        return;
      }
    }

    const requestMetadata = getRequestMetadata(req);
    const acceptance = buildAcceptanceCapture(
      req,
      body,
      normalizedSignerEmail ?? "",
    );

    if (acceptance.error) {
      res.status(400).json({ error: acceptance.error });
      return;
    }

    const capture = acceptance.capture;
    const newStatus = body.action === "accept" ? "accepted" : "declined";
    const now = capture?.signedAt ?? new Date();
    const [updatedRevision] = await dbModule.db
      .update(dbModule.proposalRevisionsTable)
      .set({
        status: newStatus,
        signedAt: body.action === "accept" ? now : null,
        declinedAt: body.action === "decline" ? now : null,
        signerName: body.action === "accept" ? capture?.signedByName ?? null : null,
        signerEmail: body.action === "accept" ? capture?.signerEmail ?? null : null,
        signerInitials:
          body.action === "accept" ? capture?.signatureInitials ?? null : null,
        signatureDataUrl:
          body.action === "accept" ? capture?.signatureDataUrl ?? null : null,
        acceptanceEvidence:
          body.action === "accept" ? capture?.acceptanceEvidence ?? null : null,
      })
      .where(eq(dbModule.proposalRevisionsTable.id, activeRevision.id))
      .returning();

    await dbModule.db
      .update(dbModule.proposalSigningTokensTable)
      .set({ usedAt: now })
      .where(eq(dbModule.proposalSigningTokensTable.id, signingToken.id));

    await dbModule.db
      .update(dbModule.proposalsTable)
      .set({
        status: newStatus,
        lastActivityAt: now,
        updatedAt: now,
        signedByName: body.action === "accept" ? capture?.signedByName ?? null : null,
        signatureInitials:
          body.action === "accept" ? capture?.signatureInitials ?? null : null,
        signatureDataUrl:
          body.action === "accept" ? capture?.signatureDataUrl ?? null : null,
        acceptanceEvidence:
          body.action === "accept" ? capture?.acceptanceEvidence ?? null : null,
        signedAt: body.action === "accept" ? now : null,
      })
      .where(eq(dbModule.proposalsTable.id, proposal.id));

    await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
      workspaceId: (proposal as ProposalRecord).workspaceId ?? null,
      proposalId: proposal.id,
      revisionId: activeRevision.id,
      eventType: body.action === "accept" ? "proposal_signed" : "proposal_declined",
      actorType: "recipient",
      actorEmail: normalizedSignerEmail,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      metadata: {
        snapshotHash: updatedRevision.snapshotHash,
        resendEmailId: updatedRevision.resendEmailId ?? undefined,
      },
    });

    if (body.action === "accept") {
      try {
        const appOrigin = requireAppOrigin();
        const resendFrom = requireResendFromEmail();
        const revisionSnapshot = getRevisionSnapshot(
          updatedRevision as ProposalRevisionRecord,
        );
        const publicLink = new URL(
          `/p/${revisionSnapshot.publicSlug}`,
          `${appOrigin}/`,
        ).toString();
        const recipientLink = body.signingToken?.trim()
          ? buildSigningLink(appOrigin, revisionSnapshot.publicSlug, body.signingToken.trim())
          : publicLink;
        const confirmationRecipients = [
          normalizeEmail(updatedRevision.signingRecipientEmail),
          normalizeEmail((proposal as ProposalRecord).parties?.sender.email),
        ].filter(Boolean);

        for (const recipient of Array.from(new Set(confirmationRecipients))) {
          const confirmationEmail = buildSignedConfirmationEmail({
            proposalTitle: revisionSnapshot.title,
            recipientName:
              revisionSnapshot.clientName ||
              revisionSnapshot.signingRecipientEmail ||
              "mottagaren",
            senderDisplayName: getProposalSenderDisplayName({ branding: revisionSnapshot.branding } as any),
            signedAt: now,
            snapshotHash: updatedRevision.snapshotHash,
            documentLink:
              recipient === normalizeEmail(updatedRevision.signingRecipientEmail)
                ? recipientLink
                : publicLink,
            logoUrl: getProposalLogoUrl({ branding: revisionSnapshot.branding }),
            accentColor: getProposalAccentColor({ branding: revisionSnapshot.branding }),
          });
          const emailResult = await sendEmail({
            from: resendFrom,
            to: recipient,
            subject: confirmationEmail.subject,
            html: confirmationEmail.html,
            text: confirmationEmail.text,
          });

          await logProposalAuditEvent(
            dbModule.db,
            dbModule.proposalAuditEventsTable,
          {
            workspaceId: (proposal as ProposalRecord).workspaceId ?? null,
            proposalId: proposal.id,
            revisionId: activeRevision.id,
            eventType: "confirmation_sent",
              actorType: "system",
              actorEmail: recipient,
              metadata: {
                emailId: emailResult.id,
                snapshotHash: updatedRevision.snapshotHash,
              },
            },
          );
        }
      } catch (confirmationError) {
        req.log.error(
          { err: confirmationError, proposalId: proposal.id },
          "Failed to send signing confirmation emails",
        );
      }
    }

    res.json(
      toPublicProposalView(
        buildPublicProposalFromRevision(
          integrity.snapshot,
          updatedRevision as ProposalRevisionRecord,
        ),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to respond to proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/evidence", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    if (!hasDatabase) {
      res.status(501).json({ error: "Evidence export requires database mode." });
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();
    const [proposal] = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(
        and(
          eq(dbModule.proposalsTable.id, id),
          eq(dbModule.proposalsTable.workspaceId, workspaceId),
        ),
      );

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const [activeRevision, auditEvents, signingTokens] = await Promise.all([
      ensureActiveRevisionForProposal(proposal as ProposalRecord, dbModule),
      dbModule.db
        .select()
        .from(dbModule.proposalAuditEventsTable)
        .where(eq(dbModule.proposalAuditEventsTable.proposalId, proposal.id))
        .orderBy(dbModule.proposalAuditEventsTable.createdAt),
      dbModule.db
        .select({
          id: dbModule.proposalSigningTokensTable.id,
          recipientEmail: dbModule.proposalSigningTokensTable.recipientEmail,
          emailId: dbModule.proposalSigningTokensTable.emailId,
          expiresAt: dbModule.proposalSigningTokensTable.expiresAt,
          usedAt: dbModule.proposalSigningTokensTable.usedAt,
          createdAt: dbModule.proposalSigningTokensTable.createdAt,
        })
        .from(dbModule.proposalSigningTokensTable)
        .where(eq(dbModule.proposalSigningTokensTable.proposalId, proposal.id))
        .orderBy(dbModule.proposalSigningTokensTable.createdAt),
    ]);
    const auditSummaries = await loadAuditSummaryMap([proposal.id], dbModule);

    res.json(
      ProposalEvidenceResponse.parse({
        proposal: serializeProposal(proposal as ProposalRecord, {
          activeRevision,
          auditSummary: auditSummaries.get(proposal.id),
        }),
        activeRevision: activeRevision
          ? serializeProposalRevision(activeRevision)
          : undefined,
        auditEvents: (auditEvents as ProposalAuditEventRecord[]).map(
          serializeProposalAuditEvent,
        ),
        signingTokens: signingTokens.map(serializeSigningToken),
        generatedAt: new Date().toISOString(),
        exportedBy: {
          id: req.auth!.userId,
          email: req.auth!.email,
        },
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get proposal evidence");
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

    if (!hasDatabase) {
      const proposal = await getLocalProposalById(id);
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }
      res.json(serializeProposal(proposal));
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();
    const [proposal] = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(
        and(
          eq(dbModule.proposalsTable.id, id),
          eq(dbModule.proposalsTable.workspaceId, workspaceId),
        ),
      );

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const activeRevision = await ensureActiveRevisionForProposal(
      proposal as ProposalRecord,
      dbModule,
    );
    const auditSummaries = await loadAuditSummaryMap([proposal.id], dbModule);

    res.json(
      serializeProposal(proposal as ProposalRecord, {
        activeRevision,
        auditSummary: auditSummaries.get(proposal.id),
      }),
    );
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

    if (!hasDatabase) {
      const updated = await updateLocalProposal(id, body);
      if (!updated) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }
      res.json(serializeProposal(updated));
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();
    const [existing] = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(
        and(
          eq(dbModule.proposalsTable.id, id),
          eq(dbModule.proposalsTable.workspaceId, workspaceId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const updates: Partial<typeof dbModule.proposalsTable.$inferInsert> = {
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };

    if (
      body.parties !== undefined ||
      body.clientName !== undefined ||
      body.clientEmail !== undefined
    ) {
      const nextParties = buildProposalParties(
        (existing as ProposalRecord).parties,
        {
          parties: body.parties,
          clientName: body.clientName,
          clientEmail: body.clientEmail,
        },
      );

      updates.parties =
        nextParties as unknown as typeof dbModule.proposalsTable.$inferInsert["parties"];
      updates.clientName = nextParties.recipient.companyName;
      updates.clientEmail = nextParties.recipient.email || null;
    }

    if (body.title !== undefined) updates.title = body.title;
    if (body.sections !== undefined) {
      updates.sections =
        body.sections as unknown as typeof dbModule.proposalsTable.$inferInsert["sections"];
    }
    if (body.branding !== undefined) {
      updates.branding =
        body.branding as unknown as typeof dbModule.proposalsTable.$inferInsert["branding"];
    }
    if (body.totalValue !== undefined) {
      updates.totalValue = body.totalValue.toString();
    }

    const [updated] = await dbModule.db
      .update(dbModule.proposalsTable)
      .set(updates)
      .where(
        and(
          eq(dbModule.proposalsTable.id, id),
          eq(dbModule.proposalsTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
      workspaceId,
      proposalId: id,
      revisionId: (existing as ProposalRecord).activeRevisionId ?? null,
      eventType: "proposal_updated",
      actorType: "sender",
      actorEmail: getProposalSenderEmail(updated as ProposalRecord),
      metadata: {
        touchedTitle: body.title !== undefined,
        touchedSections: body.sections !== undefined,
        touchedBranding: body.branding !== undefined,
        touchedParties:
          body.parties !== undefined ||
          body.clientName !== undefined ||
          body.clientEmail !== undefined,
      },
    });

    const activeRevision = await ensureActiveRevisionForProposal(
      updated as ProposalRecord,
      dbModule,
    );
    const auditSummaries = await loadAuditSummaryMap([updated.id], dbModule);

    res.json(
      serializeProposal(updated as ProposalRecord, {
        activeRevision,
        auditSummary: auditSummaries.get(updated.id),
      }),
    );
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

    if (!hasDatabase) {
      await deleteLocalProposal(id);
      res.status(204).send();
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();
    await dbModule.db
      .delete(dbModule.proposalsTable)
      .where(
        and(
          eq(dbModule.proposalsTable.id, id),
          eq(dbModule.proposalsTable.workspaceId, workspaceId),
        ),
      );
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

    if (!hasDatabase) {
      const updated = await sendLocalProposal(id, body);
      if (!updated) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }
      res.json(serializeProposal(updated));
      return;
    }

    const workspaceId = req.auth!.workspaceId;
    const dbModule = await getDbModule();
    const [existing] = await dbModule.db
      .select()
      .from(dbModule.proposalsTable)
      .where(
        and(
          eq(dbModule.proposalsTable.id, id),
          eq(dbModule.proposalsTable.workspaceId, workspaceId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const nextParties = buildProposalParties(
      (existing as ProposalRecord).parties,
      {
        clientEmail: body.clientEmail,
      },
    );
    const senderEmail = getProposalSenderEmail(existing as ProposalRecord);
    const recipientEmail = normalizeEmail(nextParties.recipient.email);

    if (senderEmail && recipientEmail && senderEmail === recipientEmail) {
      res.status(400).json({
        error:
          "Avsändaren och motparten kan inte använda samma e-postadress om motparten ska signera offerten.",
      });
      return;
    }

    if (!recipientEmail) {
      res.status(400).json({
        error: "Motpartens e-postadress krävs för att skicka en signerbar offert.",
      });
      return;
    }

    const appOrigin = requireAppOrigin();
    const resendFrom = requireResendFromEmail();
    const previousActiveRevision = await ensureActiveRevisionForProposal(
      existing as ProposalRecord,
      dbModule,
    );
    const previousRevisionRows = await dbModule.db
      .select({
        revisionNumber: dbModule.proposalRevisionsTable.revisionNumber,
      })
      .from(dbModule.proposalRevisionsTable)
      .where(eq(dbModule.proposalRevisionsTable.proposalId, existing.id));
    const nextRevisionNumber =
      previousRevisionRows.reduce(
        (maxRevision, revision) =>
          Math.max(maxRevision, revision.revisionNumber),
        0,
      ) + 1;
    const proposalForSigning = {
      ...(existing as ProposalRecord),
      parties: nextParties,
      clientName: nextParties.recipient.companyName,
      clientEmail: nextParties.recipient.email || null,
      personalMessage: body.personalMessage ?? null,
    } as ProposalRecord;
    const senderDisplayName = getProposalSenderDisplayName(proposalForSigning);
    const recipientDisplayName = getProposalRecipientDisplayName(proposalForSigning);
    const accentColor = getProposalAccentColor(proposalForSigning);
    const fromIdentity = formatEmailIdentity(resendFrom, senderDisplayName);
    const replyToEmail = isUsableEmailAddress(senderEmail) ? senderEmail : undefined;
    const sentAt = new Date();
    const snapshot = buildProposalRevisionSnapshot({
      proposalId: existing.id,
      title: proposalForSigning.title,
      clientName: proposalForSigning.clientName,
      clientEmail: proposalForSigning.clientEmail ?? null,
      totalValue: proposalForSigning.totalValue,
      publicSlug: proposalForSigning.publicSlug,
      templateId: proposalForSigning.templateId ?? null,
      sections: proposalForSigning.sections,
      branding: proposalForSigning.branding,
      parties: proposalForSigning.parties ?? normalizeProposalParties(undefined),
      personalMessage: proposalForSigning.personalMessage ?? null,
      signingRecipientEmail: recipientEmail,
      createdAt: proposalForSigning.createdAt,
      updatedAt: proposalForSigning.updatedAt,
      sentAt,
    });
    const snapshotHash = hashProposalSnapshot(snapshot);
    const [createdRevision] = await dbModule.db
      .insert(dbModule.proposalRevisionsTable)
      .values({
        workspaceId,
        proposalId: existing.id,
        revisionNumber: nextRevisionNumber,
        status: "sent",
        snapshot,
        snapshotHash,
        signingRecipientEmail: recipientEmail,
        isActive: false,
        sentAt,
      })
      .returning();
    const { rawToken, tokenHash } = createSigningToken();
    const expiresAt = createSigningTokenExpiry();
    const signingLink = buildSigningLink(appOrigin, existing.publicSlug, rawToken);
    const emailContent = buildSigningEmail({
      proposalTitle: existing.title,
      recipientName: recipientDisplayName,
      senderDisplayName,
      senderEmail: replyToEmail,
      accentColor,
      logoUrl: getProposalLogoUrl(existing),
      personalMessage: body.personalMessage ?? null,
      signingLink,
    });

    const [createdToken] = await dbModule.db
      .insert(dbModule.proposalSigningTokensTable)
      .values({
        workspaceId,
        proposalId: existing.id,
        revisionId: createdRevision.id,
        recipientEmail,
        tokenHash,
        expiresAt,
      })
      .returning();

    try {
      const emailResult = await sendEmail({
        from: fromIdentity,
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        replyTo: replyToEmail,
      });

      if (previousActiveRevision) {
        await dbModule.db
          .update(dbModule.proposalRevisionsTable)
          .set({ isActive: false })
          .where(eq(dbModule.proposalRevisionsTable.id, previousActiveRevision.id));
      }

      await dbModule.db
        .update(dbModule.proposalSigningTokensTable)
        .set({ usedAt: sentAt })
        .where(
          and(
            eq(dbModule.proposalSigningTokensTable.proposalId, existing.id),
            isNull(dbModule.proposalSigningTokensTable.usedAt),
            ne(dbModule.proposalSigningTokensTable.id, createdToken.id),
          ),
        );

      if (emailResult.id) {
        await dbModule.db
          .update(dbModule.proposalSigningTokensTable)
          .set({ emailId: emailResult.id })
          .where(eq(dbModule.proposalSigningTokensTable.id, createdToken.id));
      }

      const [activatedRevision] = await dbModule.db
        .update(dbModule.proposalRevisionsTable)
        .set({
          isActive: true,
          resendEmailId: emailResult.id ?? null,
        })
        .where(eq(dbModule.proposalRevisionsTable.id, createdRevision.id))
        .returning();

      const [updated] = await dbModule.db
        .update(dbModule.proposalsTable)
        .set({
          status: "sent",
          activeRevisionId: createdRevision.id,
          clientEmail: nextParties.recipient.email || null,
          parties:
            nextParties as unknown as typeof dbModule.proposalsTable.$inferInsert["parties"],
          personalMessage: body.personalMessage ?? null,
          signedByName: null,
          signatureInitials: null,
          signatureDataUrl: null,
          acceptanceEvidence: null,
          signedAt: null,
          updatedAt: sentAt,
          lastActivityAt: sentAt,
        })
        .where(
          and(
            eq(dbModule.proposalsTable.id, id),
            eq(dbModule.proposalsTable.workspaceId, workspaceId),
          ),
        )
        .returning();

      await logProposalAuditEvent(dbModule.db, dbModule.proposalAuditEventsTable, {
        workspaceId,
        proposalId: existing.id,
        revisionId: createdRevision.id,
        eventType: previousActiveRevision ? "new_revision_created" : "proposal_sent",
        actorType: "sender",
        actorEmail: senderEmail || undefined,
        metadata: {
          revisionNumber: createdRevision.revisionNumber,
          snapshotHash,
        },
      });

      if (previousActiveRevision) {
        await logProposalAuditEvent(
          dbModule.db,
          dbModule.proposalAuditEventsTable,
          {
            workspaceId,
            proposalId: existing.id,
            revisionId: createdRevision.id,
            eventType: "proposal_sent",
            actorType: "sender",
            actorEmail: senderEmail || undefined,
            metadata: {
              revisionNumber: createdRevision.revisionNumber,
              snapshotHash,
            },
          },
        );
      }

      const auditSummaries = await loadAuditSummaryMap([existing.id], dbModule);
      res.json(
        serializeProposal(updated as ProposalRecord, {
          activeRevision: activatedRevision as ProposalRevisionRecord,
          auditSummary: auditSummaries.get(existing.id),
        }),
      );
      return;
    } catch (error) {
      await dbModule.db
        .delete(dbModule.proposalSigningTokensTable)
        .where(eq(dbModule.proposalSigningTokensTable.id, createdToken.id));
      await dbModule.db
        .delete(dbModule.proposalRevisionsTable)
        .where(eq(dbModule.proposalRevisionsTable.id, createdRevision.id));
      throw error;
    }
  } catch (err) {
    req.log.error({ err }, "Failed to send proposal");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

export default router;
