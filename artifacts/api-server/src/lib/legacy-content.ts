import { randomBytes } from "crypto";
import type { ContentBlock, PricingRow, ProposalSection } from "@workspace/api-zod";

function createId(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex")}`;
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizePricingRow(
  value: unknown,
  rowIndex: number,
): PricingRow {
  const row = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const quantity = toNumber(row.quantity, 1);
  const unitPrice = toNumber(row.unitPrice, 0);
  const type = row.type === "recurring" ? "recurring" : "one_time";
  const interval =
    type === "recurring" && (row.interval === "yearly" || row.interval === "monthly")
      ? row.interval
      : type === "recurring"
        ? "monthly"
        : undefined;

  return {
    id: typeof row.id === "string" && row.id ? row.id : createId(`row-${rowIndex + 1}`),
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description
        : `Tjänst ${rowIndex + 1}`,
    quantity,
    unitPrice,
    unit: typeof row.unit === "string" && row.unit.trim() ? row.unit : undefined,
    type,
    interval,
    bindingPeriod:
      row.bindingPeriod === undefined ? undefined : toNumber(row.bindingPeriod, 0),
    total: quantity * unitPrice,
  };
}

function normalizeContentBlock(
  value: unknown,
  sectionIndex: number,
  blockIndex: number,
): ContentBlock {
  const block = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const blockType =
    block.type === "heading" ||
    block.type === "text" ||
    block.type === "pricing" ||
    block.type === "image"
      ? block.type
      : "text";

  const baseBlock = {
    id:
      typeof block.id === "string" && block.id
        ? block.id
        : createId(`block-${sectionIndex + 1}-${blockIndex + 1}`),
    type: blockType,
  } satisfies Pick<ContentBlock, "id" | "type">;

  if (blockType === "pricing") {
    const rows = Array.isArray(block.rows) ? block.rows : [];

    return {
      ...baseBlock,
      rows: rows.map((row, rowIndex) => normalizePricingRow(row, rowIndex)),
      discount: toNumber(block.discount, 0),
      vatEnabled: typeof block.vatEnabled === "boolean" ? block.vatEnabled : true,
      description:
        typeof block.description === "string" ? block.description : undefined,
      features: Array.isArray(block.features)
        ? block.features.filter((entry): entry is string => typeof entry === "string")
        : undefined,
    };
  }

  if (blockType === "heading") {
    return {
      ...baseBlock,
      level: toNumber(block.level, 2),
      content: typeof block.content === "string" ? block.content : "",
    };
  }

  if (blockType === "image") {
    return {
      ...baseBlock,
      imageUrl: typeof block.imageUrl === "string" ? block.imageUrl : "",
    };
  }

  return {
    ...baseBlock,
    content: typeof block.content === "string" ? block.content : "",
  };
}

export function normalizeProposalSections(sections: unknown): ProposalSection[] {
  const safeSections = Array.isArray(sections) ? sections : [];

  return safeSections.map((section, sectionIndex) => {
    const value = section && typeof section === "object"
      ? (section as Record<string, unknown>)
      : {};

    return {
      id:
        typeof value.id === "string" && value.id
          ? value.id
          : createId(`section-${sectionIndex + 1}`),
      title:
        typeof value.title === "string" && value.title.trim()
          ? value.title
          : `Sektion ${sectionIndex + 1}`,
      blocks: Array.isArray(value.blocks)
        ? value.blocks.map((block, blockIndex) =>
            normalizeContentBlock(block, sectionIndex, blockIndex),
          )
        : [],
    };
  });
}
