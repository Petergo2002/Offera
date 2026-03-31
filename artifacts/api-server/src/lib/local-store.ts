import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CopyTemplateRequest,
  CreateProposalRequest,
  CreateTemplateRequest,
  DocumentDesignSettings,
  PricingRow,
  Proposal,
  ProposalSection,
  RespondToProposalRequest,
  SendProposalRequest,
  Template,
  TemplateCategory,
  UpdateProposalRequest,
  UpdateTemplateRequest,
} from "@workspace/api-zod";
import {
  createDefaultProposalParties,
  normalizeProposalParties,
  type ProposalAcceptanceEvidence,
  type ProposalParties,
} from "@workspace/db/schema";

type StoredProposal = Proposal & {
  templateId?: number;
  parties: ProposalParties;
  acceptanceEvidence?: ProposalAcceptanceEvidence;
};

type StoreData = {
  nextProposalId: number;
  nextTemplateId: number;
  proposals: StoredProposal[];
  templates: Template[];
};

type AcceptanceRequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

const STORE_DIR = path.resolve(process.cwd(), ".local");
const STORE_PATH = path.join(STORE_DIR, "offera-dev-data.json");

export const DEFAULT_DESIGN_SETTINGS: DocumentDesignSettings = {
  accentColor: "#FF5C00",
  fontPairing: "modern",
  coverEnabled: true,
  coverBackground: "#0F172A",
  logoPosition: "left",
  dividerStyle: "line",
};

function makeId() {
  return randomBytes(4).toString("hex");
}

function makeSlug() {
  return randomBytes(5).toString("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEmail(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeTemplateName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createPricingRow(description: string): PricingRow {
  return {
    id: makeId(),
    description,
    quantity: 1,
    unitPrice: 0,
    type: "one_time",
    total: 0,
  };
}

function buildProposalParties(
  currentParties: ProposalParties | null | undefined,
  updates: {
    parties?: ProposalParties;
    clientName?: string;
    clientEmail?: string;
  },
) {
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

function applyRecipientMirror(proposal: StoredProposal, parties: ProposalParties) {
  proposal.parties = parties;
  proposal.clientName = parties.recipient.companyName;
  proposal.clientEmail = parties.recipient.email || undefined;
}

function inferFontPairing(value: unknown): DocumentDesignSettings["fontPairing"] {
  if (value === "playfair") return "klassisk";
  if (value === "dm-sans") return "editorial";
  return "modern";
}

function toDesignSettings(value: unknown): DocumentDesignSettings {
  const candidate = (value ?? {}) as Record<string, unknown>;

  return {
    accentColor:
      typeof candidate.accentColor === "string"
        ? candidate.accentColor
        : DEFAULT_DESIGN_SETTINGS.accentColor,
    fontPairing:
      candidate.fontPairing === "modern" ||
      candidate.fontPairing === "klassisk" ||
      candidate.fontPairing === "editorial"
        ? candidate.fontPairing
        : inferFontPairing(candidate.font),
    coverEnabled:
      typeof candidate.coverEnabled === "boolean"
        ? candidate.coverEnabled
        : DEFAULT_DESIGN_SETTINGS.coverEnabled,
    coverBackground:
      typeof candidate.coverBackground === "string"
        ? candidate.coverBackground
        : typeof candidate.coverBg === "string"
          ? candidate.coverBg
          : DEFAULT_DESIGN_SETTINGS.coverBackground,
    coverHeadline:
      typeof candidate.coverHeadline === "string"
        ? candidate.coverHeadline
        : typeof candidate.coverTitle === "string"
          ? candidate.coverTitle
          : undefined,
    coverSubheadline:
      typeof candidate.coverSubheadline === "string"
        ? candidate.coverSubheadline
        : typeof candidate.coverSubtitle === "string"
          ? candidate.coverSubtitle
          : undefined,
    logoPosition:
      candidate.logoPosition === "left" ||
      candidate.logoPosition === "center" ||
      candidate.logoPosition === "right"
        ? candidate.logoPosition
        : candidate.coverLogoPosition === "left" ||
            candidate.coverLogoPosition === "center" ||
            candidate.coverLogoPosition === "right"
          ? candidate.coverLogoPosition
          : DEFAULT_DESIGN_SETTINGS.logoPosition,
    dividerStyle:
      candidate.dividerStyle === "line" ||
      candidate.dividerStyle === "space" ||
      candidate.dividerStyle === "decorative"
        ? candidate.dividerStyle
        : DEFAULT_DESIGN_SETTINGS.dividerStyle,
  };
}

export function getDefaultCoverHeadline(category?: TemplateCategory) {
  switch (category) {
    case "webb":
      return "Webbprojekt för {{kundnamn}}";
    case "ai-agent":
      return "AI-agent för {{kundnamn}}";
    case "konsult":
      return "Konsultupplägg för {{kundnamn}}";
    default:
      return "Offert för {{kundnamn}}";
  }
}

export function makeDefaultSections(): ProposalSection[] {
  return [
    {
      id: makeId(),
      title: "Översikt",
      blocks: [
        {
          id: makeId(),
          type: "heading",
          content: "Offert för {{kundnamn}}",
          level: 1,
        },
        {
          id: makeId(),
          type: "text",
          content:
            "Beskriv tjänsten här och ersätt platshållarna innan offerten skickas.",
        },
      ],
    },
    {
      id: makeId(),
      title: "Leverans",
      blocks: [
        {
          id: makeId(),
          type: "heading",
          content: "Detta ingår",
          level: 2,
        },
        {
          id: makeId(),
          type: "text",
          content:
            "Beskriv leveransen här...\n\n• Leverans 1\n• Leverans 2\n• Leverans 3",
        },
      ],
    },
    {
      id: makeId(),
      title: "Prissättning",
      blocks: [
        {
          id: makeId(),
          type: "heading",
          content: "Investering",
          level: 2,
        },
        {
          id: makeId(),
          type: "pricing",
          rows: [createPricingRow("Tjänst 1")],
          discount: 0,
          vatEnabled: true,
        },
      ],
    },
    {
      id: makeId(),
      title: "Villkor",
      blocks: [
        {
          id: makeId(),
          type: "heading",
          content: "Villkor",
          level: 2,
        },
        {
          id: makeId(),
          type: "text",
          content:
            "Betalningsvillkor: 14 dagar netto.\nOfferten gäller i 30 dagar från {{datum}}.",
        },
      ],
    },
  ];
}

function makeStarterTemplate(
  name: string,
  category: TemplateCategory,
  accentColor: string,
  fontPairing: DocumentDesignSettings["fontPairing"],
  description: string,
  scopeHeading: string,
  scopeBody: string,
): Omit<Template, "id" | "createdAt" | "updatedAt"> {
  return {
    name,
    description,
    category,
    designSettings: {
      ...DEFAULT_DESIGN_SETTINGS,
      accentColor,
      fontPairing,
      coverHeadline: getDefaultCoverHeadline(category),
      coverSubheadline: "Upplägg och investering för {{tjänst}}",
    },
    sections: [
      {
        id: makeId(),
        title: "Översikt",
        blocks: [
          {
            id: makeId(),
            type: "heading",
            content: getDefaultCoverHeadline(category),
            level: 1,
          },
          {
            id: makeId(),
            type: "text",
            content:
              "Det här är en mall för {{tjänst}}. Anpassa sammanfattningen så att den beskriver nuläge, målbild och varför lösningen passar {{kundnamn}}.",
          },
        ],
      },
      {
        id: makeId(),
        title: "Omfattning",
        blocks: [
          { id: makeId(), type: "heading", content: scopeHeading, level: 2 },
          { id: makeId(), type: "text", content: scopeBody },
        ],
      },
      {
        id: makeId(),
        title: "Process",
        blocks: [
          {
            id: makeId(),
            type: "heading",
            content: "Arbetsprocess",
            level: 2,
          },
          {
            id: makeId(),
            type: "text",
            content:
              "1. Workshop med {{kundnamn}}\n2. Leverans av första utkastet\n3. Feedbackrunda\n4. Slutleverans och överlämning",
          },
        ],
      },
      {
        id: makeId(),
        title: "Prissättning",
        blocks: [
          {
            id: makeId(),
            type: "heading",
            content: "Investering",
            level: 2,
          },
          {
            id: makeId(),
            type: "pricing",
            rows: [createPricingRow("Tjänst 1"), createPricingRow("Tjänst 2")],
            discount: 0,
            vatEnabled: true,
          },
        ],
      },
      {
        id: makeId(),
        title: "Villkor",
        blocks: [
          {
            id: makeId(),
            type: "heading",
            content: "Villkor",
            level: 2,
          },
          {
            id: makeId(),
            type: "text",
            content:
              "Beskriv betalningsvillkor, giltighetstid och eventuella antaganden här. Håll texten generell så att den fungerar för flera kunder.",
          },
        ],
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
  };
}

export const BUILTIN_TEMPLATES: Array<
  Omit<Template, "id" | "createdAt" | "updatedAt">
> = [
  makeStarterTemplate(
    "Webb & Design",
    "webb",
    "#FF5C00",
    "modern",
    "För webbprojekt, designuppdrag och digitala lanseringar.",
    "Vad som ingår i projektet",
    "Beskriv webbupplägget här...\n\n• Discovery och workshops\n• Struktur och wireframes\n• Design av centrala sidor\n• Utveckling och QA\n• Lansering och uppföljning",
  ),
  makeStarterTemplate(
    "AI-agent / Maja",
    "ai-agent",
    "#4F46E5",
    "editorial",
    "För AI-agenter, automation och operativa AI-leveranser.",
    "Vad agenten ska göra",
    "Beskriv AI-agentens ansvar här...\n\n• Identifiera vilka arbetsflöden som automatiseras\n• Beskriv vilka system agenten ska arbeta i\n• Förklara hur uppföljning och förbättring sker",
  ),
  makeStarterTemplate(
    "Konsulttjänst",
    "konsult",
    "#0F172A",
    "klassisk",
    "För rådgivning, strategi, förändringsledning och specialiststöd.",
    "Uppdragets omfattning",
    "Beskriv konsultuppdraget här...\n\n• Nulägesanalys\n• Strategisk rekommendation\n• Implementeringsstöd\n• Löpande avstämningar",
  ),
];

function calculatePricingRows(rows: PricingRow[]) {
  return rows.map((row) => ({
    ...row,
    total: row.quantity * row.unitPrice,
  }));
}

function calculateSectionTotals(sections: ProposalSection[]) {
  return sections.reduce((sum, section) => {
    return (
      sum +
      section.blocks.reduce((blockSum, block) => {
        if (block.type !== "pricing") return blockSum;
        const rows = calculatePricingRows(block.rows ?? []);
        const subtotal = rows.reduce((rowSum, row) => rowSum + row.total, 0);
        const discountAmount = subtotal * ((block.discount ?? 0) / 100);
        const taxBase = subtotal - discountAmount;
        const vat = block.vatEnabled === false ? 0 : taxBase * 0.25;
        return blockSum + taxBase + vat;
      }, 0)
    );
  }, 0);
}

function sanitizeTextContent(content: string | undefined, proposal: Proposal) {
  let next = content ?? "";

  if (proposal.clientName) {
    next = next.replace(
      new RegExp(escapeRegExp(proposal.clientName), "gi"),
      "{{kundnamn}}",
    );
  }

  if (proposal.clientEmail) {
    next = next.replace(
      new RegExp(escapeRegExp(proposal.clientEmail), "gi"),
      "{{kundepost}}",
    );
  }

  return next;
}

export function sanitizeSectionsForTemplate(proposal: Proposal): ProposalSection[] {
  return proposal.sections
    .filter((section) => section.id !== "__offera_parties__")
    .map((section) => ({
    ...clone(section),
    blocks: section.blocks.map((block) => {
      if (block.type === "pricing") {
        return {
          ...clone(block),
          rows: (block.rows ?? []).map((row, index) => ({
            ...clone(row),
            description: `Tjänst ${index + 1}`,
            quantity: 1,
            unitPrice: 0,
            total: 0,
          })),
          discount: 0,
        };
      }

      if (block.type === "heading" || block.type === "text") {
        return {
          ...clone(block),
          content: sanitizeTextContent(block.content, proposal),
        };
      }

      return clone(block);
    }),
  }));
}

function reviveProposal(value: Record<string, unknown>): StoredProposal {
  const parties = normalizeProposalParties(
    (value.parties as ProposalParties | undefined) ?? createDefaultProposalParties(),
    typeof value.clientName === "string" ? value.clientName : "",
    typeof value.clientEmail === "string" ? value.clientEmail : "",
  );

  return {
    id: Number(value.id),
    title: typeof value.title === "string" ? value.title : "Ny offert",
    clientName: parties.recipient.companyName,
    clientEmail: parties.recipient.email || undefined,
    status:
      value.status === "draft" ||
      value.status === "sent" ||
      value.status === "viewed" ||
      value.status === "accepted" ||
      value.status === "declined"
        ? value.status
        : "draft",
    totalValue: Number(value.totalValue ?? 0),
    publicSlug: typeof value.publicSlug === "string" ? value.publicSlug : makeSlug(),
    templateId: typeof value.templateId === "number" ? value.templateId : undefined,
    sections: Array.isArray(value.sections)
      ? (value.sections as ProposalSection[])
      : makeDefaultSections(),
    branding: toDesignSettings(value.branding),
    personalMessage:
      typeof value.personalMessage === "string" ? value.personalMessage : undefined,
    signedByName: typeof value.signedByName === "string" ? value.signedByName : undefined,
    signatureInitials:
      typeof value.signatureInitials === "string" ? value.signatureInitials : undefined,
    signatureDataUrl:
      typeof value.signatureDataUrl === "string" ? value.signatureDataUrl : undefined,
    signedAt:
      typeof value.signedAt === "string" ? new Date(value.signedAt) : undefined,
    createdAt:
      typeof value.createdAt === "string" ? new Date(value.createdAt) : new Date(),
    updatedAt:
      typeof value.updatedAt === "string" ? new Date(value.updatedAt) : new Date(),
    lastActivityAt:
      typeof value.lastActivityAt === "string"
        ? new Date(value.lastActivityAt)
        : undefined,
    parties,
    acceptanceEvidence: value.acceptanceEvidence as ProposalAcceptanceEvidence | undefined,
  };
}

function reviveTemplate(value: Record<string, unknown>): Template {
  return {
    id: Number(value.id),
    name: typeof value.name === "string" ? value.name : `Mall ${value.id}`,
    description: typeof value.description === "string" ? value.description : undefined,
    category:
      value.category === "webb" ||
      value.category === "ai-agent" ||
      value.category === "konsult" ||
      value.category === "ovrigt"
        ? value.category
        : "ovrigt",
    designSettings: toDesignSettings(value.designSettings ?? value.branding),
    sections: Array.isArray(value.sections)
      ? (value.sections as ProposalSection[])
      : makeDefaultSections(),
    isBuiltIn:
      typeof value.isBuiltIn === "boolean"
        ? value.isBuiltIn
        : typeof value.isBuiltin === "boolean"
          ? value.isBuiltin
          : false,
    usageCount: typeof value.usageCount === "number" ? value.usageCount : 0,
    createdAt:
      typeof value.createdAt === "string" ? new Date(value.createdAt) : new Date(),
    updatedAt:
      typeof value.updatedAt === "string"
        ? new Date(value.updatedAt)
        : typeof value.createdAt === "string"
          ? new Date(value.createdAt)
          : new Date(),
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function createBuiltinTemplates(): Template[] {
  const now = new Date();
  return BUILTIN_TEMPLATES.map((template, index) => ({
    ...clone(template),
    id: index + 1,
    createdAt: now,
    updatedAt: now,
  }));
}

function syncUsageCounts(store: StoreData) {
  const usage = new Map<number, number>();

  for (const proposal of store.proposals) {
    if (!proposal.templateId) continue;
    usage.set(proposal.templateId, (usage.get(proposal.templateId) ?? 0) + 1);
  }

  store.templates = store.templates.map((template) => ({
    ...template,
    usageCount: usage.get(template.id) ?? 0,
  }));
}

async function writeStore(store: StoreData) {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

async function readStore(): Promise<StoreData> {
  await mkdir(STORE_DIR, { recursive: true });

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const store: StoreData = {
      nextProposalId: parsed.nextProposalId ?? 1,
      nextTemplateId: parsed.nextTemplateId ?? 1,
      proposals: Array.isArray(parsed.proposals)
        ? parsed.proposals.map((proposal) => reviveProposal(toRecord(proposal)))
        : [],
      templates: Array.isArray(parsed.templates)
        ? parsed.templates.map((template) => reviveTemplate(toRecord(template)))
        : [],
    };

    const existingNames = new Set(store.templates.map((template) => template.name));
    for (const template of createBuiltinTemplates()) {
      if (existingNames.has(template.name)) continue;
      store.templates.push({
        ...template,
        id: store.nextTemplateId,
      });
      store.nextTemplateId += 1;
    }

    syncUsageCounts(store);

    store.nextProposalId = Math.max(
      store.nextProposalId,
      ...store.proposals.map((proposal) => proposal.id + 1),
      1,
    );
    store.nextTemplateId = Math.max(
      store.nextTemplateId,
      ...store.templates.map((template) => template.id + 1),
      1,
    );

    await writeStore(store);
    return store;
  } catch {
    const templates = createBuiltinTemplates();
    const store: StoreData = {
      nextProposalId: 1,
      nextTemplateId: templates.length + 1,
      proposals: [],
      templates,
    };
    await writeStore(store);
    return store;
  }
}

function ensureUniqueTemplateName(store: StoreData, name: string, excludeId?: number) {
  const normalized = normalizeTemplateName(name);
  const exists = store.templates.some(
    (template) =>
      template.id !== excludeId &&
      normalizeTemplateName(template.name) === normalized,
  );

  if (exists) {
    throw new Error("En mall med det namnet finns redan.");
  }
}

function makeCopyName(store: StoreData, baseName: string) {
  const root = `${baseName} (kopia)`;
  if (!store.templates.some((template) => normalizeTemplateName(template.name) === normalizeTemplateName(root))) {
    return root;
  }

  let index = 2;
  while (
    store.templates.some(
      (template) =>
        normalizeTemplateName(template.name) ===
        normalizeTemplateName(`${root} ${index}`),
    )
  ) {
    index += 1;
  }

  return `${root} ${index}`;
}

export async function listProposals(): Promise<Proposal[]> {
  const store = await readStore();
  return clone(
    store.proposals
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  );
}

export async function getProposalById(id: number): Promise<Proposal | undefined> {
  const store = await readStore();
  const proposal = store.proposals.find((entry) => entry.id === id);
  return proposal ? clone(proposal) : undefined;
}

export async function getPublicProposal(slug: string): Promise<Proposal | undefined> {
  const store = await readStore();
  const proposal = store.proposals.find((entry) => entry.publicSlug === slug);

  if (!proposal) return undefined;

  if (proposal.status === "sent") {
    proposal.status = "viewed";
    proposal.lastActivityAt = new Date();
    await writeStore(store);
  }

  return clone(proposal);
}

export async function createProposal(input: CreateProposalRequest): Promise<Proposal> {
  const store = await readStore();
  const template = input.templateId
    ? store.templates.find((entry) => entry.id === input.templateId)
    : undefined;
  const now = new Date();
  const parties = buildProposalParties(undefined, {
    clientName: input.clientName ?? "",
    clientEmail: input.clientEmail ?? "",
  });
  const sections = clone(template?.sections ?? makeDefaultSections());

  const proposal: StoredProposal = {
    id: store.nextProposalId,
    title: trimToUndefined(input.title) ?? template?.name ?? "Ny offert",
    clientName: parties.recipient.companyName,
    clientEmail: parties.recipient.email || undefined,
    status: "draft",
    totalValue: calculateSectionTotals(sections),
    publicSlug: makeSlug(),
    templateId: template?.id,
    sections,
    branding: clone(template?.designSettings ?? DEFAULT_DESIGN_SETTINGS),
    personalMessage: undefined,
    signedByName: undefined,
    signatureInitials: undefined,
    signatureDataUrl: undefined,
    signedAt: undefined,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    parties,
  };

  store.nextProposalId += 1;
  store.proposals.push(proposal);
  syncUsageCounts(store);
  await writeStore(store);
  return clone(proposal);
}

export async function updateProposal(
  id: number,
  input: UpdateProposalRequest,
): Promise<Proposal | undefined> {
  const store = await readStore();
  const proposal = store.proposals.find((entry) => entry.id === id);

  if (!proposal) return undefined;

  if (input.title !== undefined) proposal.title = input.title;
  if (input.sections !== undefined) proposal.sections = clone(input.sections);
  if (input.branding !== undefined) proposal.branding = clone(input.branding);
  if (
    input.parties !== undefined ||
    input.clientName !== undefined ||
    input.clientEmail !== undefined
  ) {
    applyRecipientMirror(
      proposal,
      buildProposalParties(proposal.parties, {
        parties: input.parties,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
      }),
    );
  }
  proposal.totalValue =
    input.totalValue !== undefined
      ? input.totalValue
      : calculateSectionTotals(proposal.sections);
  proposal.updatedAt = new Date();
  proposal.lastActivityAt = new Date();

  await writeStore(store);
  return clone(proposal);
}

export async function deleteProposal(id: number): Promise<boolean> {
  const store = await readStore();
  const next = store.proposals.filter((entry) => entry.id !== id);
  if (next.length === store.proposals.length) return false;
  store.proposals = next;
  syncUsageCounts(store);
  await writeStore(store);
  return true;
}

export async function sendProposal(
  id: number,
  input: SendProposalRequest,
): Promise<Proposal | undefined> {
  const store = await readStore();
  const proposal = store.proposals.find((entry) => entry.id === id);
  if (!proposal) return undefined;

  const nextParties = buildProposalParties(proposal.parties, {
    clientEmail: input.clientEmail,
  });
  const senderEmail = normalizeEmail(proposal.parties.sender.email);
  const recipientEmail = normalizeEmail(nextParties.recipient.email);

  if (senderEmail && recipientEmail && senderEmail === recipientEmail) {
    throw new Error(
      "Avsändaren och motparten kan inte använda samma e-postadress om motparten ska signera offerten.",
    );
  }

  proposal.status = "sent";
  applyRecipientMirror(proposal, nextParties);
  proposal.personalMessage = input.personalMessage;
  proposal.updatedAt = new Date();
  proposal.lastActivityAt = new Date();

  await writeStore(store);
  return clone(proposal);
}

export async function respondToProposal(
  slug: string,
  input: RespondToProposalRequest,
  metadata?: AcceptanceRequestMetadata,
): Promise<Proposal | undefined> {
  const store = await readStore();
  const proposal = store.proposals.find((entry) => entry.publicSlug === slug);
  if (!proposal) return undefined;

  const now = new Date();
  proposal.status = input.action === "accept" ? "accepted" : "declined";

  if (input.action === "accept") {
    const recipientEmail = normalizeEmail(proposal.parties.recipient.email || proposal.clientEmail);
    const senderEmail = normalizeEmail(proposal.parties.sender.email);
    const signerEmail = normalizeEmail(input.signerEmail);

    if (
      !signerEmail ||
      !input.signerName ||
      !input.initials ||
      !input.signatureDataUrl ||
      !input.termsAccepted
    ) {
      throw new Error("Missing required acceptance fields");
    }

    if (!recipientEmail) {
      throw new Error(
        "Offerten saknar mottagarens e-postadress. Ange motpartens e-post innan signering används.",
      );
    }

    if (senderEmail && signerEmail === senderEmail) {
      throw new Error("Avsändaren kan inte signera sin egen offert.");
    }

    if (signerEmail !== recipientEmail) {
      throw new Error(
        "Endast den angivna mottagarens e-postadress kan signera offerten.",
      );
    }

    proposal.signedByName = input.signerName;
    proposal.signatureInitials = input.initials;
    proposal.signatureDataUrl = input.signatureDataUrl;
    proposal.signedAt = now;
    proposal.acceptanceEvidence = {
      signerName: input.signerName,
      signerEmail,
      initials: input.initials,
      signatureDataUrl: input.signatureDataUrl,
      termsAccepted: true,
      consentAcceptedAt: now.toISOString(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };
  } else {
    proposal.signedByName = undefined;
    proposal.signatureInitials = undefined;
    proposal.signatureDataUrl = undefined;
    proposal.signedAt = undefined;
    proposal.acceptanceEvidence = undefined;
  }

  proposal.updatedAt = now;
  proposal.lastActivityAt = now;
  await writeStore(store);
  return clone(proposal);
}

export async function listTemplates(): Promise<Template[]> {
  const store = await readStore();
  return clone(
    store.templates.slice().sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }),
  );
}

export async function getTemplateById(id: number): Promise<Template | undefined> {
  const store = await readStore();
  const template = store.templates.find((entry) => entry.id === id);
  return template ? clone(template) : undefined;
}

export async function createTemplate(input: CreateTemplateRequest): Promise<Template> {
  const store = await readStore();
  ensureUniqueTemplateName(store, input.name);
  const source = input.sourceProposalId
    ? store.proposals.find((entry) => entry.id === input.sourceProposalId)
    : undefined;

  if (input.sourceProposalId && !source) {
    throw new Error("Source proposal not found");
  }

  const now = new Date();
  const template: Template = {
    id: store.nextTemplateId,
    name: input.name.trim(),
    description: trimToUndefined(input.description),
    category: input.category,
    designSettings: source
      ? {
          ...toDesignSettings(source.branding),
          coverHeadline:
            source.branding.coverHeadline ?? getDefaultCoverHeadline(input.category),
        }
      : {
          ...DEFAULT_DESIGN_SETTINGS,
          ...clone(input.designSettings ?? DEFAULT_DESIGN_SETTINGS),
          coverHeadline:
            input.designSettings?.coverHeadline ?? getDefaultCoverHeadline(input.category),
        },
    sections: source
      ? sanitizeSectionsForTemplate(source)
      : clone(input.sections ?? makeDefaultSections()),
    isBuiltIn: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  store.nextTemplateId += 1;
  store.templates.push(template);
  await writeStore(store);
  return clone(template);
}

export async function updateTemplate(
  id: number,
  input: UpdateTemplateRequest,
): Promise<Template | "builtin" | undefined> {
  const store = await readStore();
  const template = store.templates.find((entry) => entry.id === id);
  if (!template) return undefined;
  if (template.isBuiltIn) return "builtin";

  if (input.name !== undefined) {
    ensureUniqueTemplateName(store, input.name, id);
    template.name = input.name.trim();
  }
  if (input.description !== undefined) template.description = trimToUndefined(input.description);
  if (input.category !== undefined) template.category = input.category;
  if (input.sections !== undefined) template.sections = clone(input.sections);
  if (input.designSettings !== undefined) {
    template.designSettings = {
      ...template.designSettings,
      ...clone(input.designSettings),
    };
  }
  template.updatedAt = new Date();

  await writeStore(store);
  return clone(template);
}

export async function copyTemplate(
  id: number,
  input: CopyTemplateRequest = {},
): Promise<Template | undefined> {
  const store = await readStore();
  const source = store.templates.find((entry) => entry.id === id);
  if (!source) return undefined;

  const nextName = trimToUndefined(input.name) ?? makeCopyName(store, source.name);
  ensureUniqueTemplateName(store, nextName);
  const now = new Date();

  const copy: Template = {
    id: store.nextTemplateId,
    name: nextName,
    description: trimToUndefined(input.description) ?? source.description,
    category: input.category ?? source.category,
    designSettings: clone(source.designSettings),
    sections: clone(source.sections),
    isBuiltIn: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  store.nextTemplateId += 1;
  store.templates.push(copy);
  await writeStore(store);
  return clone(copy);
}

export async function deleteTemplate(
  id: number,
): Promise<"deleted" | "builtin" | "missing"> {
  const store = await readStore();
  const template = store.templates.find((entry) => entry.id === id);
  if (!template) return "missing";
  if (template.isBuiltIn) return "builtin";

  store.templates = store.templates.filter((entry) => entry.id !== id);
  await writeStore(store);
  return "deleted";
}
