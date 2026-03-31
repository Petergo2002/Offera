import type { CSSProperties } from "react";
import type {
  ContentBlock,
  DocumentDesignSettings,
  PricingRow,
  Proposal,
  ProposalBranding,
  ProposalSection,
  Template,
  TemplateCategory,
} from "@workspace/api-zod";

export const TEMPLATE_CATEGORY_LABELS: Record<
  TemplateCategory | "alla",
  string
> = {
  alla: "Alla",
  webb: "Webb",
  "ai-agent": "AI-agent",
  konsult: "Konsult",
  ovrigt: "Övrigt",
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "webb",
  "ai-agent",
  "konsult",
  "ovrigt",
];

export const PLACEHOLDER_TAGS = [
  "{{kundnamn}}",
  "{{kundepost}}",
  "{{datum}}",
  "{{tjänst}}",
] as const;
export const PARTIES_SECTION_ID = "__offera_parties__";
export const PARTIES_SECTION_TITLE = "Parter";

export type PlaceholderContext = {
  clientName?: string | null;
  clientEmail?: string | null;
  createdAt?: string | Date | null;
  serviceName?: string | null;
  title?: string | null;
};

export const FONT_PAIRINGS: Record<
  DocumentDesignSettings["fontPairing"],
  {
    label: string;
    headingFamily: string;
    bodyFamily: string;
  }
> = {
  modern: {
    label: "Modern",
    headingFamily: "'Manrope', sans-serif",
    bodyFamily: "'Inter', sans-serif",
  },
  klassisk: {
    label: "Klassisk",
    headingFamily: "'Playfair Display', serif",
    bodyFamily: "'Inter', sans-serif",
  },
  editorial: {
    label: "Editorial",
    headingFamily: "'Playfair Display', serif",
    bodyFamily: "'DM Sans', sans-serif",
  },
};

export const DEFAULT_DESIGN_SETTINGS: DocumentDesignSettings = {
  accentColor: "#FF5C00",
  fontPairing: "modern",
  coverEnabled: true,
  coverBackground: "#0F172A",
  logoPosition: "left",
  dividerStyle: "line",
};

export function normalizeDesignSettings(
  value: Partial<DocumentDesignSettings | ProposalBranding> | undefined,
): DocumentDesignSettings {
  return {
    accentColor: value?.accentColor || DEFAULT_DESIGN_SETTINGS.accentColor,
    fontPairing: value?.fontPairing || DEFAULT_DESIGN_SETTINGS.fontPairing,
    coverEnabled: value?.coverEnabled ?? DEFAULT_DESIGN_SETTINGS.coverEnabled,
    coverBackground:
      value?.coverBackground || DEFAULT_DESIGN_SETTINGS.coverBackground,
    coverHeadline: value?.coverHeadline,
    coverSubheadline: value?.coverSubheadline,
    logoUrl: value?.logoUrl,
    logoPosition: value?.logoPosition || DEFAULT_DESIGN_SETTINGS.logoPosition,
    dividerStyle: value?.dividerStyle || DEFAULT_DESIGN_SETTINGS.dividerStyle,
  };
}

export function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}

export function createPricingRow(description = "Tjänst 1"): PricingRow {
  return {
    id: createId(),
    description,
    quantity: 1,
    unitPrice: 0,
    unit: "",
    type: "one_time",
    interval: "monthly",
    bindingPeriod: 0,
    total: 0,
  };
}

export function createBlock(type: ContentBlock["type"]): ContentBlock {
  if (type === "heading") {
    return {
      id: createId(),
      type,
      level: 2,
      content: "Ny rubrik",
    };
  }

  if (type === "text") {
    return {
      id: createId(),
      type,
      content: "Skriv din text här...",
    };
  }

  if (type === "image") {
    return {
      id: createId(),
      type,
      imageUrl: "",
    };
  }

  if (type === "pricing") {
    return {
      id: createId(),
      type,
      rows: [createPricingRow()],
      discount: 0,
      vatEnabled: true,
      description: "Beskriv tjänsten eller paketet här för att ge kunden en tydlig bild av värdet.",
      features: [],
    };
  }

  return {
    id: createId(),
    type,
  };
}

export function createSection(title = "Ny sektion"): ProposalSection {
  return {
    id: createId(),
    title,
    blocks: [],
  };
}

export function createPartiesSection(): ProposalSection {
  return {
    id: PARTIES_SECTION_ID,
    title: PARTIES_SECTION_TITLE,
    blocks: [],
  };
}

export function isPartiesSection(section: ProposalSection) {
  return section.id === PARTIES_SECTION_ID;
}

export function ensurePartiesSection(sections: ProposalSection[]) {
  if (sections.some(isPartiesSection)) {
    return sections;
  }

  return [createPartiesSection(), ...sections];
}

export function stripPartiesSection(sections: ProposalSection[]) {
  return sections.filter((section) => !isPartiesSection(section));
}

export function createDefaultSections(): ProposalSection[] {
  return [
    {
      id: createId(),
      title: "Översikt",
      blocks: [
        {
          id: createId(),
          type: "heading",
          level: 1,
          content: "Offert för {{kundnamn}}",
        },
        {
          id: createId(),
          type: "text",
          content:
            "Beskriv tjänsten här och ersätt platshållarna innan offerten skickas.",
        },
      ],
    },
    {
      id: createId(),
      title: "Paket och priser",
      blocks: [
        {
          id: createId(),
          type: "pricing",
          rows: [createPricingRow()],
          discount: 0,
          vatEnabled: true,
        },
      ],
    },
  ];
}

export function normalizePricingRow(row: PricingRow): PricingRow {
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
    unit: row.unit?.trim() || "",
    type,
    interval,
    bindingPeriod: type === "recurring" ? bindingPeriod : 0,
    total: quantity * unitPrice,
  };
}

export function calculatePricingRows(rows: PricingRow[]): PricingRow[] {
  return rows.map(normalizePricingRow);
}

export function getPricingContractMonths(rows: PricingRow[]) {
  const recurringRows = rows.filter((row) => row.type === "recurring");
  if (recurringRows.length === 0) {
    return 0;
  }

  const explicitBinding = Math.max(
    ...recurringRows.map((row) => row.bindingPeriod || 0),
  );

  return explicitBinding > 0 ? explicitBinding : 12;
}

export function calculatePricingTotals(block: ContentBlock) {
  const rows = calculatePricingRows(block.rows ?? []);
  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
  const discountRate = Math.max(block.discount ?? 0, 0);

  // Grouped totals
  const setupTotal = rows
    .filter((r) => r.type === "one_time")
    .reduce((sum, row) => sum + row.total, 0);

  const recurringMonthly = rows
    .filter((r) => r.type === "recurring" && r.interval === "monthly")
    .reduce((sum, row) => sum + row.total, 0);

  const recurringYearly = rows
    .filter((r) => r.type === "recurring" && r.interval === "yearly")
    .reduce((sum, row) => sum + row.total, 0);
  const hasRecurring = recurringMonthly > 0 || recurringYearly > 0;
  const hasBinding =
    rows.some(
      (row) => row.type === "recurring" && (row.bindingPeriod ?? 0) > 0,
    ) && hasRecurring;
  const contractMonths = getPricingContractMonths(rows);
  const contractSubtotal =
    setupTotal +
    recurringMonthly * contractMonths +
    recurringYearly * (contractMonths / 12);

  const discountAmount = subtotal * (discountRate / 100);
  const taxBase = subtotal - discountAmount;
  const vat = block.vatEnabled === false ? 0 : taxBase * 0.25;
  const total = taxBase + vat;
  const contractDiscountAmount = contractSubtotal * (discountRate / 100);
  const contractTaxBase = contractSubtotal - contractDiscountAmount;
  const contractVat = block.vatEnabled === false ? 0 : contractTaxBase * 0.25;
  const contractTotal = contractTaxBase + contractVat;
  const monthlyEquivalent = recurringMonthly + recurringYearly / 12;
  let totalLabel = "Totalt projektvärde";
  let totalSubtitle =
    block.vatEnabled === false
      ? "Engångsbelopp exkl. moms"
      : "Engångsbelopp inkl. moms";
  let totalDisplayAmount = total;

  if (hasRecurring && hasBinding) {
    totalLabel = "Beräknat avtalsvärde";
    totalSubtitle = `Baserat på ${contractMonths} mån bindning`;
    totalDisplayAmount = contractTotal;
  } else if (hasRecurring) {
    if (recurringMonthly > 0) {
      totalLabel = "Löpande månadskostnad";
      totalSubtitle =
        recurringYearly > 0
          ? "Månadsvis, med årsavgifter omräknade"
          : "Debiteras månadsvis utan bindning";
      totalDisplayAmount = monthlyEquivalent;
    } else {
      totalLabel = "Årlig löpande kostnad";
      totalSubtitle = "Debiteras årsvis utan bindning";
      totalDisplayAmount = recurringYearly;
    }
  }

  return {
    rows,
    subtotal,
    setupTotal,
    recurringMonthly,
    recurringYearly,
    monthlyEquivalent,
    hasRecurring,
    hasBinding,
    contractMonths,
    contractSubtotal,
    hasDiscount: discountRate > 0,
    discountRate,
    discountAmount,
    taxBase,
    vat,
    total,
    contractDiscountAmount,
    contractTaxBase,
    contractVat,
    contractTotal,
    totalDisplayAmount,
    totalLabel,
    totalSubtitle,
  };
}

export function calculateDocumentTotal(sections: ProposalSection[]) {
  return sections.reduce((sum, section) => {
    return (
      sum +
      section.blocks.reduce((sectionSum, block) => {
        if (block.type !== "pricing") {
          return sectionSum;
        }

        return sectionSum + calculatePricingTotals(block).total;
      }, 0)
    );
  }, 0);
}

export function getFontStyles(settings: DocumentDesignSettings) {
  const pairing = FONT_PAIRINGS[settings.fontPairing] ?? FONT_PAIRINGS.modern;

  return {
    "--proposal-accent": settings.accentColor,
    "--proposal-heading-font": pairing.headingFamily,
    "--proposal-body-font": pairing.bodyFamily,
  } as CSSProperties;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function normalizePlaceholderKey(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

export function resolvePlaceholderValue(
  key: string,
  context: PlaceholderContext,
) {
  const normalizedKey = normalizePlaceholderKey(key);

  switch (normalizedKey) {
    case "kundnamn":
      return context.clientName?.trim() || "kunden";
    case "kundepost":
      return context.clientEmail?.trim() || "kundens e-post";
    case "datum":
      return formatDate(context.createdAt || new Date());
    case "tjänst":
      return (
        context.serviceName?.trim() ||
        context.title?.trim() ||
        "tjänsten"
      );
    default:
      return `{{${key}}}`;
  }
}

export function resolveDynamicText(
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

export function getTemplateCategoryLabel(category: TemplateCategory) {
  return TEMPLATE_CATEGORY_LABELS[category];
}

export function sectionsContainPlaceholders(sections: ProposalSection[]) {
  return sections.some((section) =>
    section.blocks.some((block) => {
      if (block.type === "heading" || block.type === "text") {
        return /\{\{[^}]+\}\}/.test(block.content ?? "");
      }

      return false;
    }),
  );
}

export function proposalNeedsInput(proposal: Proposal) {
  return (
    !proposal.clientName.trim() ||
    sectionsContainPlaceholders(proposal.sections)
  );
}

export function filterTemplates(
  templates: Template[],
  {
    category,
    search,
  }: {
    category: TemplateCategory | "alla";
    search: string;
  },
) {
  const normalizedSearch = search.trim().toLowerCase();

  return templates.filter((template) => {
    const matchesCategory =
      category === "alla" || template.category === category;
    const matchesSearch =
      !normalizedSearch ||
      template.name.toLowerCase().includes(normalizedSearch) ||
      (template.description ?? "").toLowerCase().includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });
}

export function insertPlaceholder(
  value: string,
  placeholder: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
) {
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? value.length;
  const nextValue = `${value.slice(0, start)}${placeholder}${value.slice(end)}`;
  const cursor = start + placeholder.length;

  return {
    value: nextValue,
    cursor,
  };
}
