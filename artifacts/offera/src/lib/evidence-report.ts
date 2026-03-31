import type { ProposalEvidence } from "@/lib/api";
import { formatCurrency } from "@/lib/document";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Inte registrerad";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Inte registrerad";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAuditEventLabel(value: string | undefined) {
  switch (value) {
    case "proposal_created":
      return "Offert skapad";
    case "proposal_updated":
      return "Offert uppdaterad";
    case "proposal_sent":
      return "Offert skickad";
    case "proposal_viewed":
      return "Offert öppnad";
    case "signing_link_opened":
      return "Personlig länk öppnad";
    case "proposal_signed":
      return "Offert signerad";
    case "proposal_declined":
      return "Offert avböjd";
    case "new_revision_created":
      return "Ny revision skapad";
    case "confirmation_sent":
      return "Bekräftelse skickad";
    case "tamper_detected":
      return "Manipulation upptäckt";
    default:
      return value || "Registrerad aktivitet";
  }
}

function formatJsonBlock(value: unknown) {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function getSectionSummaries(sections: unknown) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section, index) => {
      if (!section || typeof section !== "object") {
        return {
          id: `section-${index + 1}`,
          title: `Sektion ${index + 1}`,
          blockCount: 0,
        };
      }

      const candidate = section as {
        id?: string;
        title?: string;
        blocks?: unknown[];
      };

      return {
        id: candidate.id || `section-${index + 1}`,
        title: candidate.title || `Sektion ${index + 1}`,
        blockCount: Array.isArray(candidate.blocks) ? candidate.blocks.length : 0,
      };
    })
    .filter(Boolean);
}

export function buildEvidenceReportHtml(evidence: ProposalEvidence) {
  const proposal = evidence.proposal;
  const revision = evidence.activeRevision;
  const snapshot = revision?.snapshot;
  const sections = getSectionSummaries(snapshot?.sections ?? proposal.sections);
  const signatureDataUrl =
    revision?.signatureDataUrl ||
    revision?.acceptanceEvidence?.signatureDataUrl ||
    proposal.signatureDataUrl;

  const auditRows = evidence.auditEvents.length
    ? evidence.auditEvents
        .map(
          (event) => `
            <tr>
              <td>${escapeHtml(formatAuditEventLabel(event.eventType))}</td>
              <td>${escapeHtml(event.actorEmail || event.actorType || "System")}</td>
              <td>${escapeHtml(event.ipAddress || "Ej registrerad")}</td>
              <td>${escapeHtml(formatDateTime(event.createdAt))}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td colspan="4">Ingen audit trail registrerad ännu.</td>
      </tr>
    `;

  const tokenRows = evidence.signingTokens.length
    ? evidence.signingTokens
        .map(
          (token) => `
            <tr>
              <td>${escapeHtml(token.recipientEmail)}</td>
              <td>${escapeHtml(token.emailId || "Ej registrerat")}</td>
              <td>${escapeHtml(formatDateTime(token.createdAt))}</td>
              <td>${escapeHtml(formatDateTime(token.usedAt))}</td>
              <td>${escapeHtml(formatDateTime(token.expiresAt))}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td colspan="5">Ingen tokenhistorik registrerad.</td>
      </tr>
    `;

  const sectionRows = sections.length
    ? sections
        .map(
          (section) => `
            <tr>
              <td>${escapeHtml(section.title)}</td>
              <td>${escapeHtml(section.id)}</td>
              <td>${escapeHtml(section.blockCount)}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td colspan="3">Inga sektioner registrerade i snapshot.</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offera bevisrapport - ${escapeHtml(proposal.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f7fb;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
        --line: #dbe4f0;
        --accent: #4f46e5;
        --success: #059669;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .page {
        max-width: 1040px;
        margin: 0 auto;
        padding: 32px 24px 56px;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
        padding: 16px 18px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(255,255,255,0.82);
        backdrop-filter: blur(10px);
      }
      .toolbar p { margin: 0; color: var(--muted); font-size: 13px; }
      .toolbar button {
        border: none;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        font-weight: 700;
        padding: 12px 18px;
        cursor: pointer;
      }
      .hero {
        background: radial-gradient(circle at top left, rgba(79,70,229,0.12), transparent 45%), var(--card);
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(15,23,42,0.06);
      }
      .eyebrow {
        margin: 0 0 10px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }
      h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1.08;
        letter-spacing: -0.04em;
      }
      .hero-grid,
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .meta-grid { margin-top: 22px; }
      .meta-card,
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 22px;
        box-shadow: 0 10px 30px rgba(15,23,42,0.04);
      }
      .meta-label {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .meta-value {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.45;
      }
      .meta-note {
        margin-top: 8px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }
      .section {
        margin-top: 22px;
        display: grid;
        gap: 18px;
      }
      .section-title {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 10px;
        background: rgba(5,150,105,0.1);
        color: var(--success);
        font-size: 12px;
        font-weight: 700;
      }
      .split {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 18px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
        font-size: 13px;
      }
      th {
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      code, pre {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      }
      .hash {
        display: block;
        padding: 14px 16px;
        border-radius: 18px;
        background: #f8fafc;
        border: 1px solid var(--line);
        font-size: 12px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }
      .signature-box {
        min-height: 148px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 20px;
        border: 1px dashed var(--line);
        background: #fafcff;
      }
      .signature-box img {
        max-width: 100%;
        max-height: 120px;
        object-fit: contain;
      }
      .json-block {
        margin: 0;
        padding: 18px;
        border-radius: 20px;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 11px;
        line-height: 1.7;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .footer-note {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }
      @media (max-width: 860px) {
        .hero-grid,
        .meta-grid,
        .split {
          grid-template-columns: 1fr;
        }
      }
      @media print {
        body {
          background: white;
        }
        .page {
          max-width: none;
          padding: 0;
        }
        .toolbar {
          display: none;
        }
        .hero,
        .meta-card,
        .card {
          box-shadow: none;
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="toolbar">
        <p>Detta är en läsbar bevisrapport för Offera. Skriv ut eller spara som PDF vid behov.</p>
        <button type="button" onclick="window.print()">Skriv ut / Spara som PDF</button>
      </div>

      <section class="hero">
        <p class="eyebrow">Offera bevisrapport</p>
        <h1>${escapeHtml(proposal.title)}</h1>
        <div class="meta-grid">
          <div>
            <p class="meta-note">Exporterad ${escapeHtml(formatDateTime(evidence.generatedAt))} av ${escapeHtml(
              evidence.exportedBy.email || evidence.exportedBy.id || "okänd användare",
            )}.</p>
          </div>
          <div style="text-align:right">
            <span class="pill">${
              proposal.status === "accepted"
                ? "Signerad och slutförd"
                : proposal.status === "declined"
                  ? "Avböjd"
                  : "Skickad / aktiv"
            }</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="split">
          <div class="card">
            <h2 class="section-title">Avtalsöversikt</h2>
            <div class="hero-grid">
              <div>
                <p class="meta-label">Mottagare</p>
                <p class="meta-value">${escapeHtml(snapshot?.clientName || proposal.clientName || "Inte angiven")}</p>
              </div>
              <div>
                <p class="meta-label">Mottagarens e-post</p>
                <p class="meta-value">${escapeHtml(snapshot?.clientEmail || proposal.clientEmail || "Inte angiven")}</p>
              </div>
              <div>
                <p class="meta-label">Totalvärde</p>
                <p class="meta-value">${escapeHtml(formatCurrency(proposal.totalValue))}</p>
              </div>
              <div>
                <p class="meta-label">Publik länk</p>
                <p class="meta-value">${escapeHtml(snapshot?.publicSlug || proposal.publicSlug)}</p>
              </div>
            </div>
            <p class="footer-note">Rapporten bygger på den låsta signerbara revision som skickades till motparten. Om en aktiv revision saknas visas senast kända offertdata.</p>
          </div>

          <div class="card">
            <h2 class="section-title">Signeringsbevis</h2>
            <p class="meta-label">Signeringsmottagare</p>
            <p class="meta-value">${escapeHtml(revision?.signingRecipientEmail || snapshot?.signingRecipientEmail || "Inte registrerad")}</p>
            <p class="meta-label" style="margin-top:16px">Signerad av</p>
            <p class="meta-value">${escapeHtml(revision?.signerName || revision?.acceptanceEvidence?.signerName || proposal.signedByName || "Inte registrerad")}</p>
            <p class="meta-note">Signerarens e-post: ${escapeHtml(revision?.signerEmail || revision?.acceptanceEvidence?.signerEmail || "Inte registrerad")}</p>
            <p class="meta-note">Signerat: ${escapeHtml(formatDateTime(revision?.signedAt || proposal.signedAt))}</p>
            <p class="meta-note">Resend e-post-id: ${escapeHtml(revision?.resendEmailId || "Inte registrerat")}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="split">
          <div class="card">
            <h2 class="section-title">Dokumentintegritet</h2>
            <p class="meta-label">Snapshot-hash</p>
            <code class="hash">${escapeHtml(revision?.snapshotHash || proposal.snapshotHash || "Inte registrerad")}</code>
            <div class="hero-grid" style="margin-top:18px">
              <div>
                <p class="meta-label">Revision</p>
                <p class="meta-value">${escapeHtml(revision?.revisionNumber || proposal.revisionId || "Inte registrerad")}</p>
              </div>
              <div>
                <p class="meta-label">Tamper-status</p>
                <p class="meta-value">${revision?.tamperedAt ? "Mismatch registrerad" : "Ingen mismatch registrerad"}</p>
              </div>
              <div>
                <p class="meta-label">Skickad</p>
                <p class="meta-value">${escapeHtml(formatDateTime(revision?.sentAt || snapshot?.sentAt))}</p>
              </div>
              <div>
                <p class="meta-label">Öppnad</p>
                <p class="meta-value">${escapeHtml(formatDateTime(revision?.viewedAt))}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">Signatur</h2>
            <div class="signature-box">
              ${
                signatureDataUrl
                  ? `<img src="${escapeHtml(signatureDataUrl)}" alt="Signatur" />`
                  : `<p class="meta-note">Ingen signaturbild registrerad.</p>`
              }
            </div>
            <p class="footer-note">Detta bevis kompletteras av audit trail, tokenhistorik och den tekniska JSON-exporten.</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="card">
          <h2 class="section-title">Dokumentets struktur</h2>
          <table>
            <thead>
              <tr>
                <th>Sektion</th>
                <th>ID</th>
                <th>Block</th>
              </tr>
            </thead>
            <tbody>${sectionRows}</tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <div class="card">
          <h2 class="section-title">Audit trail</h2>
          <table>
            <thead>
              <tr>
                <th>Händelse</th>
                <th>Aktör</th>
                <th>IP-adress</th>
                <th>Tidpunkt</th>
              </tr>
            </thead>
            <tbody>${auditRows}</tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <div class="card">
          <h2 class="section-title">Token- och utskickshistorik</h2>
          <table>
            <thead>
              <tr>
                <th>Mottagare</th>
                <th>E-post-id</th>
                <th>Skapad</th>
                <th>Använd</th>
                <th>Utgår</th>
              </tr>
            </thead>
            <tbody>${tokenRows}</tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <div class="card">
          <h2 class="section-title">Teknisk bilaga</h2>
          <p class="footer-note">Den här delen är till för intern verifiering, revision och support. För full maskinläsbar export kan du också ladda ned JSON-paketet från arkivet.</p>
          <pre class="json-block">${formatJsonBlock({
            proposalId: proposal.id,
            proposalStatus: proposal.status,
            revisionId: revision?.id,
            revisionNumber: revision?.revisionNumber,
            snapshotHash: revision?.snapshotHash || proposal.snapshotHash,
            signingRecipientEmail:
              revision?.signingRecipientEmail || snapshot?.signingRecipientEmail,
            signerName:
              revision?.signerName ||
              revision?.acceptanceEvidence?.signerName ||
              proposal.signedByName,
            signerEmail:
              revision?.signerEmail || revision?.acceptanceEvidence?.signerEmail,
            signedAt: revision?.signedAt || proposal.signedAt,
            generatedAt: evidence.generatedAt,
          })}</pre>
        </div>
      </section>
    </div>
  </body>
</html>`;
}
