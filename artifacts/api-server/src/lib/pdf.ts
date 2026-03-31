import { createRequire } from "node:module";
import serverlessChromium from "@sparticuz/chromium";
import type {
  ContentBlock,
  PricingRow,
  Proposal,
  ProposalBranding,
  ProposalParties,
} from "@workspace/api-zod";

const require = createRequire(import.meta.url);

const DEFAULT_BRANDING: ProposalBranding = {
  accentColor: "#FF5C00",
  fontPairing: "modern",
  coverEnabled: true,
  coverBackground: "#0F172A",
  logoPosition: "left",
  dividerStyle: "line",
  glassmorphismEnabled: false,
  vibePreset: "architectural",
  gradientEnabled: false,
};

type PlaceholderContext = {
  clientName?: string;
  clientEmail?: string;
  createdAt?: Date;
  serviceName?: string;
  title?: string;
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | undefined) {
  if (!value || Number.isNaN(value.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "long",
  }).format(value);
}

function resolvePlaceholderValue(key: string, context: PlaceholderContext) {
  const normalizedKey = key.trim().toLowerCase();

  switch (normalizedKey) {
    case "kundnamn":
      return context.clientName?.trim() || "kunden";
    case "kundepost":
      return context.clientEmail?.trim() || "";
    case "datum":
      return context.createdAt ? formatDate(context.createdAt) : "";
    case "tjänst":
      return (
        context.serviceName?.trim() || context.title?.trim() || "tjänsten"
      );
    default:
      return `{{${key}}}`;
  }
}

function resolveDynamicText(
  value: string | null | undefined,
  context: PlaceholderContext,
) {
  if (!value) {
    return "";
  }

  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) =>
    resolvePlaceholderValue(key, context),
  );
}

function normalizeBranding(value: ProposalBranding | undefined): ProposalBranding {
  return {
    ...DEFAULT_BRANDING,
    ...(value ?? {}),
  };
}

function normalizePricingRow(row: PricingRow): PricingRow {
  const quantity = Number.isFinite(row.quantity) ? Math.max(row.quantity, 0) : 0;
  const unitPrice = Number.isFinite(row.unitPrice)
    ? Math.max(row.unitPrice, 0)
    : 0;
  const type = row.type === "recurring" ? "recurring" : "one_time";
  const interval =
    type === "recurring"
      ? row.interval === "yearly"
        ? "yearly"
        : "monthly"
      : undefined;
  const bindingPeriod = Math.max(Math.round(row.bindingPeriod ?? 0), 0);

  return {
    ...row,
    quantity,
    unitPrice,
    unit: row.unit?.trim() || "st",
    type,
    interval,
    bindingPeriod: type === "recurring" ? bindingPeriod : 0,
    total: quantity * unitPrice,
  };
}

function calculatePricingSummary(rows: PricingRow[], discount = 0, vatEnabled = true) {
  const normalizedRows = rows.map(normalizePricingRow);
  const subtotal = normalizedRows.reduce((sum, row) => sum + row.total, 0);
  const discountValue = Math.min(Math.max(discount, 0), subtotal);
  const taxable = Math.max(subtotal - discountValue, 0);
  const vatValue = vatEnabled ? taxable * 0.25 : 0;
  const grandTotal = taxable + vatValue;

  return {
    rows: normalizedRows,
    subtotal,
    discountValue,
    vatValue,
    grandTotal,
  };
}

function renderParties(parties: ProposalParties) {
  const sender = parties.sender;
  const recipient = parties.recipient;
  const recipientTitle =
    recipient.kind === "person"
      ? recipient.contactName || "Ej angivet"
      : recipient.companyName || "Ej angivet";

  return `
    <section class="parties-card">
      <div class="party-column">
        <p class="eyebrow">Avsändare</p>
        <h3>${escapeHtml(sender.companyName || "Ej angivet")}</h3>
        ${sender.orgNumber ? `<p class="meta-chip">Org: ${escapeHtml(sender.orgNumber)}</p>` : ""}
        <div class="party-lines">
          ${sender.contactName ? `<p>${escapeHtml(sender.contactName)}</p>` : ""}
          ${sender.email ? `<p>${escapeHtml(sender.email)}</p>` : ""}
          ${sender.phone ? `<p>${escapeHtml(sender.phone)}</p>` : ""}
          ${
            sender.address
              ? `<p>${escapeHtml(
                  [sender.address, sender.postalCode, sender.city]
                    .filter(Boolean)
                    .join(", "),
                )}</p>`
              : ""
          }
        </div>
      </div>
      <div class="party-column">
        <p class="eyebrow">Motpart</p>
        <h3>${escapeHtml(recipientTitle)}</h3>
        ${
          recipient.kind === "company" && recipient.orgNumber
            ? `<p class="meta-chip">Org: ${escapeHtml(recipient.orgNumber)}</p>`
            : ""
        }
        <div class="party-lines">
          ${
            recipient.kind === "company" && recipient.contactName
              ? `<p>${escapeHtml(recipient.contactName)}</p>`
              : ""
          }
          ${recipient.email ? `<p>${escapeHtml(recipient.email)}</p>` : ""}
          ${recipient.phone ? `<p>${escapeHtml(recipient.phone)}</p>` : ""}
          ${
            recipient.address
              ? `<p>${escapeHtml(
                  [recipient.address, recipient.postalCode, recipient.city]
                    .filter(Boolean)
                    .join(", "),
                )}</p>`
              : ""
          }
        </div>
      </div>
    </section>
  `;
}

function renderPricingBlock(block: ContentBlock) {
  const summary = calculatePricingSummary(
    block.rows ?? [],
    block.discount ?? 0,
    block.vatEnabled ?? true,
  );

  const rowHtml = summary.rows
    .map((row) => {
      const cadence =
        row.type === "recurring"
          ? ` / ${row.interval === "yearly" ? "år" : "månad"}`
          : "";

      return `
        <tr>
          <td>
            <div class="pricing-description">${escapeHtml(row.description)}</div>
            <div class="pricing-meta">${escapeHtml(
              `${row.quantity} ${row.unit || "st"} × ${formatCurrency(row.unitPrice)}${cadence}`,
            )}</div>
          </td>
          <td class="pricing-total">${escapeHtml(formatCurrency(row.total))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="pricing-card">
      ${
        block.description
          ? `<p class="pricing-intro">${escapeHtml(block.description)}</p>`
          : ""
      }
      <table class="pricing-table">
        <tbody>${rowHtml}</tbody>
      </table>
      <div class="pricing-summary">
        <div class="summary-row">
          <span>Delsumma</span>
          <strong>${escapeHtml(formatCurrency(summary.subtotal))}</strong>
        </div>
        ${
          summary.discountValue > 0
            ? `<div class="summary-row">
                <span>Rabatt</span>
                <strong>- ${escapeHtml(formatCurrency(summary.discountValue))}</strong>
              </div>`
            : ""
        }
        <div class="summary-row">
          <span>${block.vatEnabled === false ? "Moms" : "Moms 25 %"}</span>
          <strong>${escapeHtml(formatCurrency(summary.vatValue))}</strong>
        </div>
        <div class="summary-row total">
          <span>Totalt</span>
          <strong>${escapeHtml(formatCurrency(summary.grandTotal))}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderBlock(block: ContentBlock, context: PlaceholderContext) {
  if (block.type === "heading") {
    const tag =
      block.level === 1 ? "h1" : block.level === 3 ? "h3" : "h2";

    return `<${tag} class="content-heading level-${block.level}">${escapeHtml(
      resolveDynamicText(block.content, context),
    )}</${tag}>`;
  }

  if (block.type === "text") {
    return `<p class="content-text">${escapeHtml(
      resolveDynamicText(block.content, context),
    ).replaceAll("\n", "<br />")}</p>`;
  }

  if (block.type === "divider") {
    return `<hr class="content-divider" />`;
  }

  if (block.type === "image" && block.imageUrl) {
    return `
      <figure class="content-image">
        <img src="${escapeHtml(block.imageUrl)}" alt="" />
      </figure>
    `;
  }

  if (block.type === "pricing") {
    return renderPricingBlock(block);
  }

  return "";
}

function renderSections(
  proposal: Proposal,
  context: PlaceholderContext,
) {
  return proposal.sections
    .map((section) => {
      const content = section.id === "__offera_parties__"
        ? renderParties(proposal.parties)
        : section.blocks.map((block) => renderBlock(block, context)).join("");

      return `
        <section class="section">
          ${
            section.title
              ? `<h2 class="section-title">${escapeHtml(
                  resolveDynamicText(section.title, context),
                )}</h2>`
              : ""
          }
          <div class="section-content">
            ${content}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderHtml(proposal: Proposal) {
  const branding = normalizeBranding(proposal.branding);
  const fallbackCoverBackground = DEFAULT_BRANDING.coverBackground || "#0F172A";
  const context: PlaceholderContext = {
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    createdAt: proposal.createdAt,
    serviceName: proposal.title,
    title: proposal.title,
  };
  const accentColor = /^#[0-9a-f]{6}$/i.test(branding.accentColor)
    ? branding.accentColor
    : DEFAULT_BRANDING.accentColor;
  const coverBackgroundValue =
    branding.coverBackground ?? fallbackCoverBackground;
  const coverBackground = /^#[0-9a-f]{6}$/i.test(coverBackgroundValue)
    ? coverBackgroundValue
    : fallbackCoverBackground;

  return `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(proposal.title)}</title>
        <style>
          :root {
            color-scheme: light;
            --accent: ${accentColor};
            --cover: ${coverBackground};
            --text: #0f172a;
            --muted: #64748b;
            --line: #e2e8f0;
            --panel: #ffffff;
            --panel-soft: #f8fafc;
          }

          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text);
            background: #f8fafc;
          }
          .page {
            width: 100%;
            max-width: 980px;
            margin: 0 auto;
            background: #ffffff;
          }
          .cover {
            position: relative;
            overflow: hidden;
            min-height: 320px;
            padding: 56px 48px 64px;
            background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0)), var(--cover);
            color: #ffffff;
          }
          .cover::after {
            content: "";
            position: absolute;
            inset: auto -80px -120px auto;
            width: 280px;
            height: 280px;
            border-radius: 999px;
            background: rgba(255,255,255,0.08);
            filter: blur(24px);
          }
          .cover-logo {
            max-height: 48px;
            width: auto;
            max-width: 220px;
            display: block;
            margin-bottom: 36px;
          }
          .cover-badge {
            display: inline-block;
            margin-bottom: 18px;
            padding: 7px 14px;
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            background: rgba(255,255,255,0.08);
          }
          .cover h1 {
            margin: 0;
            font-size: 44px;
            line-height: 1.02;
            letter-spacing: -0.04em;
          }
          .cover p {
            margin: 18px 0 0;
            max-width: 720px;
            font-size: 17px;
            line-height: 1.7;
            color: rgba(255,255,255,0.82);
          }
          .cover-meta {
            margin-top: 32px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            max-width: 520px;
          }
          .cover-meta-card {
            padding: 18px 20px;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 24px;
            background: rgba(255,255,255,0.08);
          }
          .cover-meta-label,
          .eyebrow {
            margin: 0 0 8px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .cover-meta .cover-meta-label {
            color: rgba(255,255,255,0.68);
          }
          .cover-meta-value {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
          }
          .content {
            padding: 48px;
          }
          .message-card {
            margin-bottom: 32px;
            padding: 28px 30px;
            border: 1px solid var(--line);
            border-radius: 28px;
            background: linear-gradient(180deg, rgba(248,250,252,0.95), #fff);
            color: var(--muted);
            font-size: 18px;
            line-height: 1.75;
            font-style: italic;
          }
          .section + .section {
            margin-top: 40px;
            padding-top: 40px;
            border-top: 1px solid var(--line);
          }
          .section-title {
            margin: 0 0 20px;
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.03em;
          }
          .section-content > * + * {
            margin-top: 18px;
          }
          .parties-card {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0;
            overflow: hidden;
            border: 1px solid var(--line);
            border-radius: 28px;
            background: var(--panel-soft);
          }
          .party-column {
            padding: 28px;
          }
          .party-column + .party-column {
            border-left: 1px solid var(--line);
          }
          .party-column h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.03em;
          }
          .meta-chip {
            display: inline-block;
            margin: 10px 0 0;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(15,23,42,0.05);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .party-lines {
            margin-top: 16px;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.75;
          }
          .party-lines p { margin: 0; }
          .content-heading {
            margin: 0;
            font-weight: 800;
            letter-spacing: -0.03em;
          }
          .level-1 { font-size: 36px; }
          .level-2 { font-size: 28px; }
          .level-3 { font-size: 22px; }
          .content-text {
            margin: 0;
            color: var(--muted);
            font-size: 16px;
            line-height: 1.85;
            white-space: normal;
          }
          .content-divider {
            border: 0;
            border-top: 1px solid var(--line);
            margin: 24px 0;
          }
          .content-image {
            margin: 0;
            overflow: hidden;
            border-radius: 28px;
            background: var(--panel-soft);
          }
          .content-image img {
            display: block;
            width: 100%;
            height: auto;
          }
          .pricing-card {
            border: 1px solid var(--line);
            border-radius: 28px;
            background: var(--panel);
            overflow: hidden;
          }
          .pricing-intro {
            margin: 0;
            padding: 24px 28px 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.7;
          }
          .pricing-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          .pricing-table td {
            padding: 18px 28px;
            border-top: 1px solid var(--line);
            vertical-align: top;
          }
          .pricing-description {
            font-size: 15px;
            font-weight: 700;
            color: var(--text);
          }
          .pricing-meta {
            margin-top: 6px;
            font-size: 13px;
            color: var(--muted);
          }
          .pricing-total {
            width: 160px;
            text-align: right;
            font-size: 15px;
            font-weight: 800;
            color: var(--text);
            white-space: nowrap;
          }
          .pricing-summary {
            padding: 20px 28px 28px;
            background: var(--panel-soft);
          }
          .summary-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 8px 0;
            color: var(--muted);
            font-size: 14px;
          }
          .summary-row strong {
            color: var(--text);
            font-size: 15px;
          }
          .summary-row.total {
            margin-top: 8px;
            padding-top: 16px;
            border-top: 1px solid var(--line);
            font-size: 16px;
            font-weight: 800;
            color: var(--text);
          }
          .summary-row.total strong {
            font-size: 18px;
            color: var(--accent);
          }
          .footer {
            padding: 0 48px 40px;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.7;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="cover">
            ${
              branding.logoUrl
                ? `<img class="cover-logo" src="${escapeHtml(branding.logoUrl)}" alt="Logo" />`
                : ""
            }
            <div class="cover-badge">${escapeHtml(
              proposal.status === "accepted" ? "Signerad offert" : "Offera offert",
            )}</div>
            <h1>${escapeHtml(
              resolveDynamicText(branding.coverHeadline || proposal.title, context),
            )}</h1>
            <p>${escapeHtml(
              resolveDynamicText(
                branding.coverSubheadline ||
                  "Här är offerten som sammanfattar omfattning, innehåll och investering.",
                context,
              ),
            )}</p>
            <div class="cover-meta">
              <div class="cover-meta-card">
                <p class="cover-meta-label">Kund</p>
                <p class="cover-meta-value">${escapeHtml(
                  proposal.clientName || proposal.parties.recipient.companyName || "Ej angivet",
                )}</p>
              </div>
              <div class="cover-meta-card">
                <p class="cover-meta-label">Skapad</p>
                <p class="cover-meta-value">${escapeHtml(formatDate(proposal.createdAt))}</p>
              </div>
            </div>
          </section>

          <section class="content">
            ${
              proposal.personalMessage
                ? `<div class="message-card">${escapeHtml(proposal.personalMessage)}</div>`
                : ""
            }
            ${renderSections(proposal, context)}
          </section>

          <footer class="footer">
            Dokumentet exporterades från Offera den ${escapeHtml(
              formatDate(new Date()),
            )}. Status vid export: ${escapeHtml(proposal.status)}.
          </footer>
        </main>
      </body>
    </html>
  `;
}

async function launchPdfBrowser() {
  const isServerlessRuntime = Boolean(
    process.env.VERCEL ||
      process.env.AWS_REGION ||
      process.env.AWS_EXECUTION_ENV,
  );

  if (isServerlessRuntime) {
    const { chromium } = require("playwright-core") as typeof import("playwright-core");
    const executablePath =
      typeof (serverlessChromium as { executablePath?: unknown }).executablePath ===
      "function"
        ? await (
            serverlessChromium as unknown as { executablePath: () => Promise<string> }
          ).executablePath()
        : await (
            serverlessChromium as unknown as { executablePath: Promise<string> }
          ).executablePath;

    return chromium.launch({
      args: serverlessChromium.args,
      executablePath,
      headless: true,
    });
  }

  const { chromium } = require("playwright") as typeof import("playwright");
  return chromium.launch({ headless: true });
}

export async function generateProposalPdf(proposal: Proposal): Promise<Buffer> {
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage();
    const html = renderHtml(proposal);

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate("document.fonts ? document.fonts.ready : Promise.resolve()");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
