import React from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Loader2,
  Minus,
  Monitor,
  Palette,
  Plus,
  Save,
  Smartphone,
  Table,
  Tablet,
  Type,
  Upload,
  XCircle,
  SquareMenu,
  Send,
  Copy,
} from "lucide-react";
import type {
  ContentBlock,
  DocumentDesignSettings,
  PricingRow,
  ProposalParties,
  ProposalParty,
  ProposalSection,
} from "@workspace/api-zod";
import {
  PLACEHOLDER_TAGS,
  calculateDocumentTotal,
  calculatePricingTotals,
  calculatePricingRows,
  createBlock,
  createPricingRow,
  createSection,
  ensurePartiesSection,
  formatCurrency,
  getFontStyles,
  insertPlaceholder,
  isPartiesSection,
  FONT_PAIRINGS,
  PARTIES_SECTION_TITLE,
  resolveDynamicText,
} from "@/lib/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentBuilderProps = {
  mode: "proposal" | "template";
  readOnly?: boolean;
  title: string;
  status?: Parameters<typeof StatusBadge>[0]["status"];
  sections: ProposalSection[];
  designSettings: DocumentDesignSettings;
  onTitleChange: (value: string) => void;
  onSectionsChange: (sections: ProposalSection[]) => void;
  onDesignSettingsChange: (designSettings: DocumentDesignSettings) => void;
  onSave: () => Promise<void> | void;
  onBack: () => Promise<void> | void;
  isSaving?: boolean;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => Promise<void> | void;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => Promise<void> | void;
    loading?: boolean;
  };
  notice?: React.ReactNode;
  attentionPrompt?: React.ReactNode;
  clientName?: string;
  parties?: ProposalParties;
  onPartiesChange?: (parties: ProposalParties) => void;
  createdAt?: string | Date;
};

type SelectedBlock =
  | { type: "cover" }
  | { type: "parties" }
  | { type: "block"; sectionId: string; blockId: string }
  | null;

type PreviewDevice = "desktop" | "tablet" | "mobile";

function HighlightedText({
  value,
  className,
  as = "span",
}: {
  value: string;
  className?: string;
  as?: "div" | "span";
}) {
  const parts = value.split(/(\{\{[^}]+\}\})/g);
  const Component = as;

  return (
    <Component className={className}>
      {parts.map((part, index) =>
        /\{\{[^}]+\}\}/.test(part) ? (
          <span
            key={`${part}-${index}`}
            className="rounded bg-amber-200 px-1 py-0.5 font-medium text-amber-950"
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      )}
    </Component>
  );
}

function SectionDivider({
  designSettings,
}: {
  designSettings: DocumentDesignSettings;
}) {
  const isGlass = designSettings.glassmorphismEnabled || designSettings.vibePreset === "glass";
  const isMinimal = designSettings.vibePreset === "minimal";

  if (designSettings.dividerStyle === "space") {
    return <div className="h-12" />;
  }

  if (designSettings.dividerStyle === "decorative") {
    return (
      <div className="flex items-center justify-center py-12 px-10">
        <div className="h-[1px] flex-1 bg-outline-variant/10" />
        <div
          className="mx-6 h-1.5 w-1.5 rounded-full shadow-subtle-primary"
          style={{ backgroundColor: designSettings.accentColor }}
        />
        <div className="h-[1px] flex-1 bg-outline-variant/10" />
      </div>
    );
  }

  return <div className="my-12 h-[1px] bg-outline-variant/10 mx-10" />;
}

function getHeadingTypography(level: number | undefined) {
  if (level === 1) {
    return "text-4xl md:text-[3.3rem] leading-[0.98] font-semibold tracking-[-0.04em]";
  }

  if (level === 3) {
    return "text-xl md:text-[1.55rem] leading-[1.18] font-semibold tracking-[-0.025em]";
  }

  return "text-[2rem] md:text-[2.45rem] leading-[1.04] font-semibold tracking-[-0.035em]";
}

function getBodyTypography() {
  return "text-[1.02rem] leading-8 font-normal text-muted-foreground";
}

function getPreviewHeadingTypography(
  level: number | undefined,
  previewDevice: PreviewDevice,
) {
  if (previewDevice === "mobile") {
    if (level === 1) {
      return "text-[2.45rem] leading-[0.96] font-semibold tracking-[-0.045em]";
    }

    if (level === 3) {
      return "text-[1.18rem] leading-[1.22] font-semibold tracking-[-0.02em]";
    }

    return "text-[1.7rem] leading-[1.06] font-semibold tracking-[-0.03em]";
  }

  if (previewDevice === "tablet") {
    if (level === 1) {
      return "text-[3.25rem] leading-[0.97] font-semibold tracking-[-0.04em]";
    }

    if (level === 3) {
      return "text-[1.35rem] leading-[1.18] font-semibold tracking-[-0.02em]";
    }

    return "text-[2.1rem] leading-[1.04] font-semibold tracking-[-0.03em]";
  }

  return getHeadingTypography(level);
}

function getPreviewBodyTypography(previewDevice: PreviewDevice) {
  if (previewDevice === "mobile") {
    return "text-[0.98rem] leading-7 font-normal text-muted-foreground";
  }

  if (previewDevice === "tablet") {
    return "text-[1rem] leading-8 font-normal text-muted-foreground";
  }

  return getBodyTypography();
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  style,
  minRows = 1,
  onSelect,
  onClick,
  onKeyUp,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  minRows?: number;
  onSelect?: React.ReactEventHandler<HTMLTextAreaElement>;
  onClick?: React.MouseEventHandler<HTMLTextAreaElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const element = internalRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <Textarea
      ref={(element) => {
        internalRef.current = element;
        if (textareaRef) {
          textareaRef.current = element;
        }
      }}
      rows={minRows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSelect={onSelect}
      onClick={onClick}
      onKeyUp={onKeyUp}
      placeholder={placeholder}
      style={style}
      className={cn(
        "resize-none overflow-hidden border-none bg-transparent shadow-none focus-visible:ring-0",
        className,
      )}
      onInput={resize}
    />
  );
}

async function readImageAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Kunde inte läsa bildfilen."));
    reader.readAsDataURL(file);
  });
}

function BlockEditor({
  block,
  isPreview,
  isTemplateMode,
  designSettings,
  placeholderContext,
  previewDevice = "desktop",
  onChange,
  onDelete,
}: {
  block: ContentBlock;
  isPreview: boolean;
  isTemplateMode: boolean;
  designSettings: DocumentDesignSettings;
  placeholderContext: Parameters<typeof resolveDynamicText>[1];
  previewDevice?: PreviewDevice;
  onChange: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
}) {
  const isCompactPreview = isPreview && previewDevice === "mobile";
  const isTabletPreview = isPreview && previewDevice === "tablet";

  if (block.type === "heading") {
    const headingClass = getHeadingTypography(block.level);

    if (isPreview) {
      const className = `${getPreviewHeadingTypography(block.level, previewDevice)} text-foreground`;
      const style = {
        fontFamily: "var(--proposal-heading-font)",
      } as React.CSSProperties;

      if (block.level === 1) {
        return (
          <h1 className={className} style={style}>
            {resolveDynamicText(block.content || "", placeholderContext)}
          </h1>
        );
      }

      if (block.level === 3) {
        return (
          <h3 className={className} style={style}>
            {resolveDynamicText(block.content || "", placeholderContext)}
          </h3>
        );
      }

      return (
        <h2 className={className} style={style}>
          {resolveDynamicText(block.content || "", placeholderContext)}
        </h2>
      );
    }

    return (
      <div className="group/block relative -mx-4 rounded-[2rem] border border-transparent px-4 py-3 transition-all hover:border-outline-variant/10 hover:bg-surface-container-low/20 focus-within:border-primary/10 focus-within:bg-surface-container-low/10">
        <div className="absolute -top-4 right-4 z-10 flex scale-90 items-center gap-1.5 opacity-0 transition-all group-hover/block:top-2 group-hover/block:opacity-100">
          <select
            value={block.level || 2}
            onChange={(event) =>
              onChange({ level: Number(event.target.value) })
            }
            className="rounded-lg border border-outline-variant/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant shadow-subtle hover:bg-surface-container-low transition-colors outline-none cursor-pointer"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 rounded-lg text-on-surface-variant/40 hover:text-error hover:bg-error/5 transition-colors p-0"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </Button>
        </div>

        <AutoGrowTextarea
          value={block.content || ""}
          onChange={(value) => onChange({ content: value })}
          placeholder={`Rubrik ${block.level || 2}...`}
          style={{ fontFamily: "var(--proposal-heading-font)" }}
          minRows={1}
          className={cn(
            "p-0 text-foreground placeholder:text-on-surface-variant/20",
            headingClass,
          )}
        />
      </div>
    );
  }

  if (block.type === "text") {
    if (isPreview) {
      return (
        <HighlightedText
          value={resolveDynamicText(block.content || "", placeholderContext)}
          as="div"
          className={cn(
            "whitespace-pre-wrap",
            getPreviewBodyTypography(previewDevice),
          )}
        />
      );
    }

    return (
      <TextBlockEditor
        block={block}
        isTemplateMode={isTemplateMode}
        onChange={onChange}
        onDelete={onDelete}
      />
    );
  }

  if (block.type === "image") {
    if (isPreview) {
      return block.imageUrl ? (
        <img
          src={block.imageUrl}
          alt=""
          className="w-full rounded-2xl object-cover"
        />
      ) : null;
    }

    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            Bild
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Radera
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Label
              htmlFor={`image-upload-${block.id}`}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-primary px-4 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
            >
              <Upload className="mr-2 h-4 w-4" />
              Ladda upp bild
            </Label>
            <input
              id={`image-upload-${block.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                void readImageAsDataUrl(file).then((imageUrl) => {
                  onChange({ imageUrl });
                });
                event.target.value = "";
              }}
            />
            {block.imageUrl ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-outline-variant/10 text-[11px] font-black uppercase tracking-widest"
                onClick={() => onChange({ imageUrl: "" })}
              >
                Ta bort bild
              </Button>
            ) : null}
          </div>

          <Input
            value={block.imageUrl || ""}
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            placeholder="Klistra in bild-URL om du vill..."
          />
        </div>
        {block.imageUrl ? (
          <img
            src={block.imageUrl}
            alt=""
            className="mt-4 w-full rounded-2xl border border-border object-cover"
          />
        ) : (
          <div className="mt-4 flex h-44 items-center justify-center rounded-2xl border border-dashed border-border bg-surface-container-low text-sm text-muted-foreground">
            Ingen bild vald
          </div>
        )}
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        {!isPreview && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Minus className="h-3.5 w-3.5" />
              Avdelare
            </div>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Radera
            </Button>
          </div>
        )}
        <div className="h-px bg-border" />
      </div>
    );
  }

  if (block.type === "pricing") {
    return (
      <PackageAndPricingEditor
        block={block}
        isPreview={isPreview}
        previewDevice={previewDevice}
        designSettings={designSettings}
        onChange={onChange}
        onDelete={onDelete}
      />
    );
  }

  return null;
}

function TextBlockEditor({
  block,
  isTemplateMode,
  onChange,
  onDelete,
}: {
  block: ContentBlock;
  isTemplateMode: boolean;
  onChange: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = React.useRef({ start: 0, end: 0 });

  const handleSelectionCapture = () => {
    const element = textareaRef.current;
    if (!element) return;
    selectionRef.current = {
      start: element.selectionStart,
      end: element.selectionEnd,
    };
  };

  const handlePlaceholderInsert = (placeholder: string) => {
    const next = insertPlaceholder(
      block.content || "",
      placeholder,
      selectionRef.current.start,
      selectionRef.current.end,
    );

    onChange({ content: next.value });
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.cursor, next.cursor);
      selectionRef.current = { start: next.cursor, end: next.cursor };
    });
  };
  return (
    <div className="group/block relative -mx-4 rounded-[2rem] border border-transparent px-4 py-3 transition-all hover:border-outline-variant/10 hover:bg-surface-container-low/20 focus-within:border-primary/10 focus-within:bg-surface-container-low/10">
      <div className="absolute -top-4 right-4 z-10 flex scale-90 items-center gap-1.5 opacity-0 transition-all group-hover/block:top-2 group-hover/block:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 rounded-lg text-error/30 hover:text-error hover:bg-error/5 bg-white border border-outline-variant/10 shadow-subtle flex items-center justify-center p-0"
        >
          <Plus className="h-3.5 w-3.5 rotate-45" />
        </Button>
      </div>

      <AutoGrowTextarea
        textareaRef={textareaRef}
        value={block.content || ""}
        onChange={(value) => onChange({ content: value })}
        minRows={4}
        style={{ fontFamily: "var(--proposal-body-font)" }}
        className={cn(
          "px-0 placeholder:text-on-surface-variant/10",
          getBodyTypography(),
        )}
        onSelect={handleSelectionCapture}
        onClick={handleSelectionCapture}
        onKeyUp={handleSelectionCapture}
        placeholder="Berätta din historia här..."
      />

      {isTemplateMode && (
        <div className="mt-4 flex flex-wrap gap-1.5 opacity-0 transition-opacity group-hover/block:opacity-100">
          {PLACEHOLDER_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-lg bg-surface-container-low/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 transition-all hover:bg-primary hover:text-white border border-outline-variant/5 shadow-sm active:scale-95"
              onClick={() => handlePlaceholderInsert(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/\{\{[^}]+\}\}/.test(block.content || "") && (
        <div className="mt-4 rounded-2xl bg-primary/[0.03] border border-primary/5 p-4 text-sm text-primary">
          <HighlightedText
            value={block.content || ""}
            as="div"
            className="whitespace-pre-wrap font-medium leading-relaxed opacity-80"
          />
        </div>
      )}
    </div>
  );
}

function PackageAndPricingEditor({
  block,
  isPreview,
  previewDevice = "desktop",
  designSettings,
  onChange,
  onDelete,
}: {
  block: ContentBlock;
  isPreview: boolean;
  previewDevice?: PreviewDevice;
  designSettings: DocumentDesignSettings;
  onChange: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
}) {
  const totals = calculatePricingTotals(block);
  const rows = totals.rows;
  const isCompactPreview = isPreview && previewDevice === "mobile";
  const isTabletPreview = isPreview && previewDevice === "tablet";

  const updateRow = (rowId: string, updates: Partial<PricingRow>) => {
    const nextRows = rows.map((row) =>
      row.id === rowId ? { ...row, ...updates } : row,
    );

    onChange({ rows: calculatePricingRows(nextRows) });
  };

  const removeRow = (rowId: string) => {
    const nextRows = rows.filter((entry) => entry.id !== rowId);
    onChange({
      rows:
        nextRows.length > 0
          ? calculatePricingRows(nextRows)
          : [createPricingRow("Ny post")],
    });
  };

  const addFeature = () => {
    const nextFeatures = [...(block.features || []), "Ny funktion/egenskap"];
    onChange({ features: nextFeatures });
  };

  const updateFeature = (index: number, value: string) => {
    const nextFeatures = [...(block.features || [])];
    nextFeatures[index] = value;
    onChange({ features: nextFeatures });
  };

  const removeFeature = (index: number) => {
    const nextFeatures = [...(block.features || [])];
    nextFeatures.splice(index, 1);
    onChange({ features: nextFeatures });
  };

  return (
    <div
      className={cn(
        "group/block relative -mx-4 rounded-[2.5rem] transition-all duration-500 font-sans p-4 border border-transparent hover:border-outline-variant/10 hover:bg-surface-container-low/30",
        isPreview
          ? "border-transparent bg-transparent p-0 shadow-none -mx-0"
          : "",
      )}
    >
      {!isPreview && (
        <div className="absolute -top-4 right-4 z-10 flex scale-90 items-center gap-1.5 opacity-0 transition-all group-hover/block:top-2 group-hover/block:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 rounded-lg text-error/30 hover:text-error hover:bg-error/5 bg-white border border-outline-variant/10 shadow-subtle flex items-center justify-center p-0"
          >
            <Plus className="h-3.5 w-3.5 rotate-45" />
          </Button>
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-[2.5rem] transition-all",
          isPreview
            ? "border-none bg-white shadow-xl"
            : "border border-outline-variant/10 bg-surface-container-low/20",
        )}
      >
        {/* Package Header Section */}
        <div className="p-10 md:p-14 border-b border-outline-variant/10 bg-white">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-primary rounded-full" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                Smart Paket
              </span>
            </div>

            {isPreview ? (
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tighter text-on-surface">
                  {block.content || "Paketnamn saknas"}
                </h2>
                <p className="text-lg text-on-surface-variant/70 leading-relaxed font-medium">
                  {block.description}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <Input
                  value={block.content || ""}
                  onChange={(e) => onChange({ content: e.target.value })}
                  placeholder="Paketnamn (t.ex. Premium Webbpaket)..."
                  className="h-auto border-none bg-transparent p-0 font-black text-4xl tracking-tighter text-on-surface shadow-none focus-visible:ring-0 placeholder:text-on-surface-variant/10"
                />
                <Textarea
                  value={block.description || ""}
                  onChange={(e) => onChange({ description: e.target.value })}
                  placeholder="Beskriv tjänsten på ett säljande sätt..."
                  className="min-h-[100px] resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0 text-lg leading-relaxed text-on-surface-variant/80 placeholder:text-on-surface-variant/10 font-medium overflow-hidden"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              </div>
            )}

            {/* Feature Checklist */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                  Vad ingår i paketet?
                </h3>
                {!isPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase text-primary hover:bg-primary/5 rounded-full"
                    onClick={addFeature}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    Lägg till egenskap
                  </Button>
                )}
              </div>

              <div
                className={cn(
                  "grid gap-y-4",
                  isCompactPreview
                    ? "grid-cols-1 gap-x-0"
                    : isTabletPreview
                      ? "grid-cols-2 gap-x-6"
                      : "grid-cols-1 md:grid-cols-2 gap-x-12",
                )}
              >
                {(block.features || []).map((feature, index) => (
                  <div key={index} className="group/feature flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Plus className="h-3 w-3 text-primary stroke-[3]" />
                    </div>
                    {isPreview ? (
                      <span className="text-base font-semibold text-on-surface/80">
                        {feature}
                      </span>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="h-auto border-none bg-transparent p-0 text-base font-semibold text-on-surface shadow-none focus-visible:ring-0 placeholder:text-on-surface-variant/20"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full text-on-surface-variant/35 hover:text-error hover:bg-error/5 opacity-100 sm:opacity-0 sm:group-hover/feature:opacity-100 transition-opacity"
                          onClick={() => removeFeature(index)}
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {!isPreview && (block.features || []).length === 0 && (
                  <div className="col-span-2 py-8 border border-dashed border-outline-variant/10 rounded-2xl flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 mb-3">
                      Inga egenskaper tillagda
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-bold uppercase rounded-full border-primary/20 text-primary hover:bg-primary/5"
                      onClick={addFeature}
                    >
                      Kom igång med checklistan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low/30 backdrop-blur-sm px-8 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
            Prisspecifikation
          </h4>
        </div>
        {isCompactPreview ? (
          <div className="divide-y divide-outline-variant/5">
            {rows.map((row) => (
              <div key={row.id} className="space-y-4 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight text-on-surface">
                      {row.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-black uppercase tracking-tighter rounded-full px-2 py-0.5",
                          row.type === "one_time"
                            ? "border-amber-500/20 text-amber-600 bg-amber-50"
                            : "border-primary/20 text-primary bg-primary/5",
                        )}
                      >
                        {row.type === "one_time" ? "Engångs" : "Löpande"}
                      </Badge>
                      {row.type === "recurring" && row.bindingPeriod ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter"
                        >
                          {row.bindingPeriod} mån bindning
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums text-on-surface">
                      {formatCurrency(row.total)}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                      totalt
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface-container-low/35 p-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                      Antal
                    </p>
                    <p className="mt-1 text-sm font-bold text-on-surface">
                      {row.quantity} {row.unit || "st"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                      A-pris
                    </p>
                    <p className="mt-1 text-sm font-bold text-on-surface">
                      {formatCurrency(row.unitPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                      Intervall
                    </p>
                    <p className="mt-1 text-sm font-bold text-on-surface">
                      {row.type === "recurring"
                        ? row.interval === "yearly"
                          ? "Per år"
                          : "Per mån"
                        : "Engång"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr
              className={cn(
                "border-b border-outline-variant/10",
                isPreview ? "bg-transparent" : "bg-surface-container-low/50",
              )}
            >
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                Beskrivning
              </th>
              <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 w-[120px]">
                Typ
              </th>
              <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right w-[80px]">
                Antal
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right w-[150px]">
                Pris / Enhet
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right w-[150px]">
                Totalt
              </th>
              {!isPreview && <th className="w-16 px-4 py-5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group/row transition-colors hover:bg-surface-container-low/10"
              >
                <td className="px-8 py-6 align-top">
                  {isPreview ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-on-surface text-lg tracking-tight">
                        {row.description}
                      </span>
                      {row.unit && row.unit !== "st" && (
                        <span className="text-xs text-on-surface-variant/60">
                          Enhet: {row.unit}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={row.description}
                        onChange={(event) =>
                          updateRow(row.id, { description: event.target.value })
                        }
                        className="border-none bg-transparent px-0 h-auto shadow-none focus-visible:ring-0 font-bold text-on-surface text-lg tracking-tight placeholder:text-on-surface-variant/20"
                        placeholder="Beskriv tjänst eller produkt..."
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.unit ?? ""}
                          onChange={(e) =>
                            updateRow(row.id, { unit: e.target.value })
                          }
                          className="h-6 w-20 text-[10px] font-bold uppercase tracking-wider bg-surface-container-high/30 border-none px-2 rounded-md focus-visible:ring-1 ring-primary/20"
                          placeholder="ENHET"
                        />
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-5 py-6 align-top">
                  {isPreview ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-black uppercase tracking-tighter rounded-full px-2 py-0.5",
                        row.type === "one_time"
                          ? "border-amber-500/20 text-amber-600 bg-amber-50"
                          : "border-primary/20 text-primary bg-primary/5",
                      )}
                    >
                      {row.type === "one_time" ? "Engångs" : "Löpande"}
                    </Badge>
                  ) : (
                    <Select
                      value={row.type}
                      onValueChange={(val) =>
                        updateRow(row.id, {
                          type: val as any,
                          interval: val === "recurring" ? "monthly" : undefined,
                        })
                      }
                    >
                      <SelectTrigger className="border-none bg-transparent h-auto p-0 shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">Engångs</SelectItem>
                        <SelectItem value="recurring">Löpande</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {row.type === "recurring" && (
                    <div className="mt-2">
                      {isPreview ? (
                        row.bindingPeriod ? (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter"
                          >
                            {row.bindingPeriod} mån bindning
                          </Badge>
                        ) : null
                      ) : (
                        <Select
                          value={String(row.bindingPeriod || 0)}
                          onValueChange={(val) =>
                            updateRow(row.id, { bindingPeriod: Number(val) })
                          }
                        >
                          <SelectTrigger className="h-6 w-auto min-w-[90px] text-[9px] font-black uppercase tracking-widest bg-primary/5 border-none px-2 rounded-md shadow-none focus:ring-0 text-primary">
                            <SelectValue placeholder="Bindningstid" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Ingen bindning</SelectItem>
                            <SelectItem value="12">12 månader</SelectItem>
                            <SelectItem value="24">24 månader</SelectItem>
                            <SelectItem value="36">36 månader</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-5 py-6 text-right align-top">
                  {isPreview ? (
                    <span className="font-bold text-on-surface-variant text-lg tabular-nums">
                      {row.quantity}
                    </span>
                  ) : (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={row.quantity === 0 ? "" : String(row.quantity)}
                      onChange={(event) =>
                        updateRow(row.id, {
                          quantity:
                            event.target.value === ""
                              ? 0
                              : Number(event.target.value) || 0,
                        })
                      }
                      className="border-none bg-transparent text-right shadow-none focus-visible:ring-0 font-bold text-lg p-0 h-auto tabular-nums"
                    />
                  )}
                </td>
                <td className="px-8 py-6 text-right align-top">
                  {isPreview ? (
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-on-surface-variant text-lg tabular-nums">
                        {formatCurrency(row.unitPrice)}
                      </span>
                      {row.type === "recurring" && (
                        <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-1.5 py-0.5 rounded mt-1">
                          / {row.interval === "monthly" ? "mån" : "år"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={row.unitPrice === 0 ? "" : String(row.unitPrice)}
                        onChange={(event) =>
                          updateRow(row.id, {
                            unitPrice:
                              event.target.value === ""
                                ? 0
                                : Number(event.target.value) || 0,
                          })
                        }
                        className="border-none bg-transparent text-right shadow-none focus-visible:ring-0 font-bold text-lg p-0 h-auto tabular-nums"
                      />
                      {row.type === "recurring" && (
                        <Select
                          value={row.interval}
                          onValueChange={(val) =>
                            updateRow(row.id, { interval: val as any })
                          }
                        >
                          <SelectTrigger className="h-6 w-20 text-[10px] font-bold uppercase bg-surface-container-high/30 border-none px-2 rounded-md shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Månad</SelectItem>
                            <SelectItem value="yearly">År</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right font-black text-on-surface text-lg align-top tabular-nums">
                  {formatCurrency(row.total)}
                </td>
                {!isPreview && (
                  <td className="px-4 py-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl text-on-surface-variant/35 hover:text-error hover:bg-error/5 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-all hover:scale-110"
                      onClick={() => removeRow(row.id)}
                    >
                      <Plus className="h-5 w-5 rotate-45" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        )}

        {!isPreview && (
          <div className="border-t border-outline-variant/10 bg-surface-container-low/30 px-8 py-4 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 h-10 px-6 rounded-xl transition-all"
              onClick={() =>
                onChange({ rows: [...rows, createPricingRow(`Ny post`)] })
              }
            >
              <Plus className="mr-2.5 h-4 w-4" />
              Lägg till post
            </Button>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                  Moms (25%)
                </span>
                <Switch
                  checked={block.vatEnabled !== false}
                  onCheckedChange={(checked) => onChange({ vatEnabled: checked })}
                  className="scale-90 data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex items-center gap-3 bg-white/50 rounded-xl px-4 py-1.5 border border-outline-variant/10 shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                  Rabatt %
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={totals.hasDiscount ? String(block.discount ?? "") : ""}
                  onChange={(event) =>
                    onChange({
                      discount:
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value) || 0,
                    })
                  }
                  className="h-7 w-14 text-right border-none bg-transparent shadow-none focus-visible:ring-0 p-0 font-bold text-sm"
                  placeholder="Valfri"
                />
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "p-10 border-t border-outline-variant/10 font-sans transition-all",
            isPreview
              ? ((designSettings.glassmorphismEnabled || designSettings.vibePreset === "glass") ? "glass-card bg-primary/5" : "bg-surface-container-lowest")
              : "bg-surface-container-low/50",
          )}
        >
          <div className={cn("ml-auto w-full space-y-4", isCompactPreview ? "max-w-full" : "max-w-md")}>
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-widest text-[11px] font-black text-on-surface-variant/40">
                Initial investering
              </span>
              <span className="font-bold text-lg tabular-nums text-on-surface/80">
                {formatCurrency(totals.setupTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="uppercase tracking-widest text-[11px] font-black text-on-surface-variant/40">
                  Löpande månadskostnad
                </span>
                {totals.recurringYearly > 0 && (
                  <span className="text-[10px] text-on-surface-variant/30 italic">
                    Inkl. årsavgifter omräknat till mån
                  </span>
                )}
              </div>
              <span className="font-bold text-lg tabular-nums text-primary">
                {formatCurrency(totals.monthlyEquivalent)}
              </span>
            </div>

            {totals.recurringYearly > 0 && (
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-widest text-[11px] font-black text-on-surface-variant/40">
                  Årlig löpande kostnad
                </span>
                <span className="font-bold text-lg tabular-nums text-on-surface/80">
                  {formatCurrency(totals.recurringYearly)}
                </span>
              </div>
            )}

            <div className="h-px bg-outline-variant/10 my-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-widest text-[11px] font-black text-on-surface-variant/40">
                  Moms (25%)
                </span>
                {!isPreview && (
                  <Switch
                    checked={block.vatEnabled !== false}
                    onCheckedChange={(checked) => onChange({ vatEnabled: checked })}
                    className="scale-90"
                  />
                )}
              </div>
              <span
                className={cn(
                  "font-bold text-lg tabular-nums text-on-surface/80 transition-all",
                  block.vatEnabled === false && "opacity-20 line-through",
                )}
              >
                {formatCurrency(totals.vat)}
              </span>
            </div>

            {totals.hasDiscount && (
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-widest text-[11px] font-black text-on-surface-variant/40">
                  Total rabatt
                </span>
                <span className="font-bold text-lg tabular-nums text-error/60">
                  -{formatCurrency(totals.discountAmount)}
                </span>
              </div>
            )}

            <div className={cn(
              "pt-6 mt-4 border-t-2 border-dashed border-outline-variant/20",
              isPreview && designSettings.gradientEnabled && "relative"
            )}>
              {isPreview && designSettings.gradientEnabled && (
                <div className="absolute inset-0 jewel-gradient opacity-5 rounded-2xl -m-4 pointer-events-none" />
              )}
              <div className="flex items-center justify-between relative">
                <div className="flex flex-col">
                  <span className={cn(
                    "uppercase tracking-widest text-[12px] font-black",
                    isPreview && designSettings.gradientEnabled ? "text-primary" : "text-on-surface"
                  )}>
                    {totals.totalLabel}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                    {totals.totalSubtitle}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-black tabular-nums tracking-tighter transition-all duration-500",
                    isCompactPreview ? "text-[2.2rem]" : "text-4xl",
                    isPreview && designSettings.gradientEnabled ? "text-primary scale-110" : "text-on-surface"
                  )}
                  style={isPreview && !designSettings.gradientEnabled ? { color: "var(--proposal-accent)" } : {}}
                >
                  {formatCurrency(totals.totalDisplayAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartiesPanel({
  parties,
  onChange,
}: {
  parties: ProposalParties;
  onChange: (parties: ProposalParties) => void;
}) {
  const updatePartyField = (
    side: "sender" | "recipient",
    field: keyof ProposalParty,
    value: string,
  ) => {
    onChange({
      ...parties,
      [side]: {
        ...parties[side],
        [field]: value,
      },
    });
  };

  const updateRecipientKind = (kind: ProposalParties["recipient"]["kind"]) => {
    onChange({
      ...parties,
      recipient: {
        ...parties.recipient,
        kind,
        orgNumber: kind === "person" ? "" : parties.recipient.orgNumber,
      },
    });
  };

  return (
    <div className="rounded-[2.5rem] border border-outline-variant/10 bg-white shadow-elevated p-8 md:p-16 animate-in fade-in zoom-in-95 font-sans">
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1.5 w-12 bg-primary rounded-full" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
            Kontraktsparter
          </p>
        </div>
        <h2 className="text-5xl font-black tracking-tighter text-on-surface">
          Juridisk Information
        </h2>
        <p className="mt-6 max-w-2xl text-xl text-on-surface-variant/60 font-medium leading-relaxed">
          Vänligen verifiera att alla företagsuppgifter och kontaktinformation
          är korrekta. Dessa data ligger till grund för det formella avtalet.
        </p>
      </div>

      <div className="space-y-20">
        <PartySection
          title="Tjänsteleverantör"
          description="Dina eller ditt företags juridiska uppgifter."
          party={parties.sender}
          primaryLabel="Företagsnamn"
          showOrgNumber
          onChange={(field, value) => updatePartyField("sender", field, value)}
        />

        <div className="relative py-10">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-outline-variant/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-6 text-sm font-black uppercase tracking-widest text-on-surface-variant/20 italic">
              VS
            </span>
          </div>
        </div>

        <div className="space-y-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-on-surface tracking-tight">
                Motpart
              </h3>
              <p className="text-on-surface-variant/50 font-medium uppercase text-[10px] tracking-widest">
                Vem riktar sig offerten till?
              </p>
            </div>
            <div className="inline-flex gap-1.5 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/5">
              {(
                [
                  { id: "company", label: "Företag" },
                  { id: "person", label: "Privatperson" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-500",
                    parties.recipient.kind === option.id
                      ? "bg-white text-on-surface shadow-elevated scale-[1.05]"
                      : "text-on-surface-variant/40 hover:text-on-surface hover:bg-white/50",
                  )}
                  onClick={() => updateRecipientKind(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <PartySection
              title=""
              description=""
              party={parties.recipient}
              primaryLabel={
                parties.recipient.kind === "person"
                  ? "Fullständigt Namn"
                  : "Företagsnamn"
              }
              showOrgNumber={parties.recipient.kind === "company"}
              onChange={(field, value) =>
                updatePartyField("recipient", field, value)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PartySection({
  title,
  description,
  party,
  primaryLabel,
  showOrgNumber,
  onChange,
}: {
  title: string;
  description: string;
  party: ProposalParty;
  primaryLabel: string;
  showOrgNumber: boolean;
  onChange: (field: keyof ProposalParty, value: string) => void;
}) {
  return (
    <div className="space-y-10">
      {title ? (
        <div className="space-y-2 border-l-4 border-primary/20 pl-6">
          <h3 className="text-2xl font-black text-on-surface tracking-tight">
            {title}
          </h3>
          <p className="text-on-surface-variant/60 font-medium">
            {description}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <FieldInput
          label={primaryLabel}
          value={party.companyName}
          onChange={(value) => onChange("companyName", value)}
          className={showOrgNumber ? "" : "md:col-span-2"}
          placeholder="T.ex. Antigravity AB"
        />
        {showOrgNumber ? (
          <FieldInput
            label="Organisationsnummer"
            value={party.orgNumber}
            onChange={(value) => onChange("orgNumber", value)}
            placeholder="556677-8899"
          />
        ) : null}
        <FieldInput
          label="Kontaktperson"
          value={party.contactName}
          onChange={(value) => onChange("contactName", value)}
          placeholder="För- och efternamn"
        />
        <FieldInput
          label="E-postadress"
          type="email"
          value={party.email}
          onChange={(value) => onChange("email", value)}
          placeholder="namn@foretag.se"
        />
        <FieldInput
          label="Telefonnummer"
          value={party.phone}
          onChange={(value) => onChange("phone", value)}
          placeholder="070-123 45 67"
        />
        <FieldInput
          label="Fullständig Adress"
          value={party.address}
          onChange={(value) => onChange("address", value)}
          placeholder="Gatunamn 123"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <FieldInput
          label="Postnummer"
          value={party.postalCode}
          onChange={(value) => onChange("postalCode", value)}
          placeholder="123 45"
        />
        <FieldInput
          label="Stad / Ort"
          value={party.city}
          onChange={(value) => onChange("city", value)}
          placeholder="Stockholm"
        />
      </div>
    </div>
  );
}

function PartyCover({
  parties,
  designSettings,
  className,
  isCompact,
}: {
  parties: ProposalParties;
  designSettings: DocumentDesignSettings;
  className?: string;
  isCompact?: boolean;
}) {
  return (
    <div className={cn(
      "relative flex flex-col justify-between gap-8 overflow-hidden rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-lowest/50 px-4 py-8 font-sans shadow-subtle sm:px-6 md:gap-12 md:px-12 md:py-14",
      !isCompact && "md:flex-row",
      className,
    )}>
      <div
        className="absolute top-0 left-0 w-2 h-full"
        style={{ backgroundColor: designSettings.accentColor }}
      />
      <div className="flex-1 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-8 rounded-full bg-outline-variant/20" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
            Avsändare
          </p>
        </div>
        <div className="break-words">
          <h3 className="mb-2 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
            {parties.sender.companyName}
          </h3>
          {parties.sender.orgNumber && (
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">
              Org: {parties.sender.orgNumber}
            </p>
          )}
          <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed">
            {parties.sender.contactName}
            <br />
            <span className="text-xs sm:text-sm">{parties.sender.email}</span>
            <br />
            {parties.sender.phone}
          </p>
        </div>
      </div>

      <div className="hidden md:block w-px bg-outline-variant/10" />

      <div className="flex-1 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 w-8 rounded-full"
            style={{ backgroundColor: designSettings.accentColor }}
          />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
            Mottagare
          </p>
        </div>
        <div className="break-words">
          <h3 className="mb-2 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
            {parties.recipient.kind === "company"
              ? parties.recipient.companyName
              : parties.recipient.contactName}
          </h3>
          {parties.recipient.kind === "company" &&
            parties.recipient.orgNumber && (
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">
                Org: {parties.recipient.orgNumber}
              </p>
            )}
          <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed">
            {parties.recipient.kind === "company" &&
            parties.recipient.contactName ? (
              <>
                {parties.recipient.contactName}
                <br />
              </>
            ) : null}
            <span className="text-xs sm:text-sm">{parties.recipient.email}</span>
            <br />
            {parties.recipient.phone}
          </p>
        </div>
      </div>
    </div>
  );
}

function PartiesInlineCard({
  parties,
  designSettings,
  onOpen,
}: {
  parties: ProposalParties;
  designSettings: DocumentDesignSettings;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="group/parties w-full rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-lowest/60 p-5 text-left shadow-subtle transition-all hover:border-primary/15 hover:bg-surface-container-lowest sm:p-8"
      onClick={onOpen}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Juridiska parter
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
              Klicka för att redigera avtalets parter
            </h3>
          </div>
        </div>
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest"
        >
          Öppna dialog
        </Badge>
      </div>

      <PartyCover
        parties={parties}
        designSettings={designSettings}
        className="mb-0"
        isCompact={false}
      />
    </button>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  className,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl border-outline-variant/10 bg-white/50 focus-visible:ring-primary/20 transition-all font-medium text-xs placeholder:text-on-surface-variant/20 shadow-none border"
      />
    </div>
  );
}

function ReviewChecklist({
  parties,
  sections,
  title,
}: {
  parties?: ProposalParties;
  sections: ProposalSection[];
  title: string;
}) {
  const issues = React.useMemo(() => {
    const list: Array<{ id: string; label: string; status: "done" | "todo" }> = [];

    // Title check
    list.push({
      id: "title",
      label: "Namnge din offert",
      status: title.trim() ? "done" : "todo",
    });

    // Content check
    const hasContent = (sections || []).some((s) => (s.blocks || []).length > 0);
    list.push({
      id: "content",
      label: "Lägg till innehåll",
      status: hasContent ? "done" : "todo",
    });

    // Parties check
    if (parties) {
      const partiesIncomplete =
        !parties.sender.companyName.trim() ||
        !parties.sender.email.trim() ||
        !parties.recipient.companyName.trim() ||
        !parties.recipient.email.trim();
      
      list.push({
        id: "parties",
        label: "Fyll i kontaktuppgifter",
        status: !partiesIncomplete ? "done" : "todo",
      });
    }

    // Pricing check
    const hasPricing = (sections || []).some((s) => (s.blocks || []).some(b => b.type === "pricing"));
    list.push({
      id: "pricing",
      label: "Ange prisdetaljer",
      status: hasPricing ? "done" : "todo",
    });

    return list;
  }, [parties, sections, title]);

  const allDone = issues.every(i => i.status === "done");

  return (
    <div className="mb-10 overflow-hidden rounded-[2rem] border border-outline-variant/10 bg-white shadow-subtle animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between border-b border-outline-variant/5 bg-surface-container-low/30 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500",
            allDone ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
          )}>
            <CheckCircle2 size={18} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-on-surface">
            Checklista inför utskick
          </h3>
        </div>
        <Badge variant="outline" className={cn(
          "rounded-full px-3 py-1 font-black uppercase text-[9px] tracking-widest",
          allDone ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
        )}>
          {allDone ? "Redo att skickas" : "Åtgärder krävs"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-outline-variant/5">
        {issues.map((issue) => (
          <div key={issue.id} className="p-6 flex items-center gap-4 group hover:bg-primary/[0.02] transition-colors">
            <div className={cn(
              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              issue.status === "done" 
                ? "bg-emerald-500 border-emerald-500 text-white scale-110" 
                : "border-outline-variant/20 group-hover:border-primary/20"
            )}>
              {issue.status === "done" && <CheckCircle2 size={12} className="stroke-[4]" />}
            </div>
            <span className={cn(
              "text-xs font-bold transition-all",
              issue.status === "done" ? "text-on-surface/50 line-through decoration-emerald-500/20" : "text-on-surface"
            )}>
              {issue.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentBuilderSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-lowest">
      <aside className="w-[280px] xl:w-[340px] shrink-0 border-r border-outline-variant/10 bg-white p-8 space-y-8 hidden lg:block">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-8 w-1 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
        <div className="space-y-4 pt-10">
          <Skeleton className="h-4 w-20" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface-container-low/20">
        <div className="mx-auto max-w-[900px] px-10 py-20 space-y-12">
          <header className="space-y-4">
            <Skeleton className="h-10 w-2/3 rounded-xl" />
            <Skeleton className="h-6 w-1/3 rounded-xl" />
          </header>
          <Skeleton className="h-32 w-full rounded-[2.5rem]" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-[3rem]" />
        </div>
      </main>
    </div>
  );
}

export function DocumentBuilder({
  mode,
  readOnly = false,
  title,
  status,
  sections,
  designSettings,
  onTitleChange,
  onSectionsChange,
  onDesignSettingsChange,
  onSave,
  onBack,
  isSaving = false,
  primaryAction,
  secondaryAction,
  notice,
  attentionPrompt,
  clientName = "",
  parties,
  onPartiesChange,
  createdAt,
}: DocumentBuilderProps) {
  const isMobile = useIsMobile();
  const [previewDevice, setPreviewDevice] = React.useState<PreviewDevice>(
    "desktop",
  );
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(
    "desktop",
  );

  const [activeTab, setActiveTab] = React.useState<"content" | "design">(
    "content",
  );
  const [selectedBlock, setSelectedBlock] = React.useState<SelectedBlock>(null);
  const [isPreview, setIsPreview] = React.useState(false);
  const [isPartiesDialogOpen, setIsPartiesDialogOpen] = React.useState(false);

  const totalValue = React.useMemo(
    () => calculateDocumentTotal(sections),
    [sections],
  );
  const styles = getFontStyles(designSettings);
  const hasPartiesPanel =
    mode === "proposal" && Boolean(parties && onPartiesChange);
  const canvasSections = React.useMemo(
    () => (hasPartiesPanel ? ensurePartiesSection(sections) : sections),
    [hasPartiesPanel, sections],
  );
  const partiesCompleted = Boolean(
    parties?.sender.companyName.trim() &&
    parties?.sender.email.trim() &&
    parties?.recipient.companyName.trim() &&
    parties?.recipient.email.trim(),
  );
  const isCompactPreview = isPreview && previewDevice === "mobile";
  const isTabletPreview = isPreview && previewDevice === "tablet";
  const isProposalPreview = isPreview && mode === "proposal";
  const isAcceptedProposal = status === "accepted";
  const isDeclinedProposal = status === "declined";
  const isAwaitingProposalResponse = status === "sent" || status === "viewed";
  const placeholderContext = React.useMemo(
    () => ({
      clientName: clientName || parties?.recipient.companyName || "",
      clientEmail: parties?.recipient.email || "",
      createdAt,
      serviceName: title,
      title,
    }),
    [clientName, createdAt, parties?.recipient.companyName, parties?.recipient.email, title],
  );

  const updateSections = (
    updater:
      | ProposalSection[]
      | ((current: ProposalSection[]) => ProposalSection[]),
  ) => {
    const next =
      typeof updater === "function" ? updater(canvasSections) : updater;
    onSectionsChange(next);
  };

  const updateBlock = (
    sectionId: string,
    blockId: string,
    updates: Partial<ContentBlock>,
  ) => {
    updateSections((current) =>
      current.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              blocks: section.blocks.map((block) =>
                block.id === blockId ? { ...block, ...updates } : block,
              ),
            },
      ),
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const nextSections = [...canvasSections];
    const [removed] = nextSections.splice(result.source.index, 1);
    nextSections.splice(result.destination.index, 0, removed);
    onSectionsChange(nextSections);
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-surface-container-lowest selection:bg-primary/20"
      style={styles}
    >
      {/* Refined Sidebar */}
      <aside
        className={cn(
          "shrink-0 border-r border-outline-variant/10 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-500",
          isPreview ? "hidden w-0" : "w-[280px] xl:w-[340px] hidden lg:flex lg:flex-col",
        )}
      >
        <div className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <h1 className="text-sm font-black uppercase tracking-[0.25em] text-on-surface">
              {mode === "template" ? "Mallverktyg" : "Offertverktyg"}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-container-low p-1.5 border border-outline-variant/5">
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === "content"
                  ? "bg-white text-on-surface shadow-subtle"
                  : "text-on-surface-variant/40 hover:text-on-surface-variant",
              )}
              onClick={() => setActiveTab("content")}
            >
              Innehåll
            </button>
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === "design"
                  ? "bg-white text-on-surface shadow-subtle"
                  : "text-on-surface-variant/40 hover:text-on-surface-variant",
              )}
              onClick={() => setActiveTab("design")}
            >
              Design
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
          {activeTab === "content" ? (
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    Sektioner
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateSections([...sections, createSection()])
                    }
                    className="h-7 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Lägg till
                  </Button>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: "cover" });
                      setIsPreview(false);
                      document
                        .getElementById("cover-section")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-300",
                      selectedBlock?.type === "cover"
                        ? "border-primary/20 bg-primary/[0.03] shadow-inner-primary"
                        : "border-outline-variant/5 bg-surface-container-low/50 hover:bg-surface-container-low",
                    )}
                  >
                    <div>
                      <p className="text-xs font-black text-on-surface">
                        Omslag
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-on-surface-variant/40 leading-relaxed uppercase tracking-widest">
                        Introduktion & Titel
                      </p>
                    </div>
                  </button>

                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="builder-sections">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2.5"
                      >
                        {canvasSections.map((section, index) => (
                          <Draggable
                            key={section.id}
                            draggableId={section.id}
                            index={index}
                          >
                            {(innerProvided, snapshot) => (
                              <div
                                ref={innerProvided.innerRef}
                                {...innerProvided.draggableProps}
                                onClick={() => {
                                  setSelectedBlock(
                                    isPartiesSection(section)
                                      ? { type: "parties" }
                                      : null,
                                  );
                                  setIsPreview(false);
                                  document
                                    .getElementById(`section-${section.id}`)
                                    ?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    });
                                }}
                                className={cn(
                                  "group cursor-pointer flex items-center justify-between rounded-2xl border border-outline-variant/5 bg-surface-container-low/50 p-4 transition-all duration-300",
                                  snapshot.isDragging &&
                                    "shadow-elevated scale-[1.02] border-primary/20 bg-white",
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div
                                    {...innerProvided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing text-on-surface-variant/20 hover:text-on-surface-variant transition-colors"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-on-surface truncate max-w-[120px]">
                                      {isPartiesSection(section)
                                        ? PARTIES_SECTION_TITLE
                                        : section.title || "Untitled"}
                                    </p>
                                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                                      {isPartiesSection(section)
                                        ? "Legala uppgifter"
                                        : `${section.blocks.length} Block`}
                                    </p>
                                  </div>
                                </div>
                                {isPartiesSection(section) ? (
                                  partiesCompleted ? (
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-600 border-amber-200 bg-amber-50"
                                    >
                                      Fyll i
                                    </Badge>
                                  )
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-on-surface-variant/20 hover:text-error hover:bg-error/5 transition-all opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSections(
                                        canvasSections.filter(
                                          (entry) => entry.id !== section.id,
                                        ),
                                      );
                                    }}
                                  >
                                    <Plus className="h-4 w-4 rotate-45" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Design content refined */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    Signaturfärg
                  </span>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-outline-variant/10 shadow-sm">
                      <input
                        type="color"
                        value={designSettings.accentColor}
                        onChange={(event) =>
                          onDesignSettingsChange({
                            ...designSettings,
                            accentColor: event.target.value,
                          })
                        }
                        className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer ring-0 outline-none"
                      />
                    </div>
                    <Input
                      value={designSettings.accentColor}
                      onChange={(event) =>
                        onDesignSettingsChange({
                          ...designSettings,
                          accentColor: event.target.value,
                        })
                      }
                      className="border-none bg-transparent shadow-none font-black text-xs uppercase tracking-widest p-0 h-auto"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    Typografi
                  </span>
                  <div className="grid gap-2">
                    {(Object.entries(FONT_PAIRINGS) as any).map(
                      ([id, pairing]: any) => (
                        <button
                          key={id}
                          type="button"
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all duration-300",
                            designSettings.fontPairing === id
                              ? "border-primary/20 bg-primary/[0.03] shadow-inner-primary scale-[1.02]"
                              : "border-outline-variant/5 bg-surface-container-low/50 hover:bg-surface-container-low",
                          )}
                          onClick={() =>
                            onDesignSettingsChange({
                              ...designSettings,
                              fontPairing: id as any,
                            })
                          }
                        >
                          <p className="text-xs font-black text-on-surface uppercase tracking-tight">
                            {pairing.label}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-on-surface-variant/40 leading-relaxed uppercase tracking-widest">
                              {pairing.headingFamily.replace(/['"]/g, "")}
                            </p>
                            <div className="h-4 w-[1px] bg-outline-variant/10" />
                            <p className="text-[10px] font-bold text-on-surface-variant/40 leading-relaxed uppercase tracking-widest">
                              Sans Serif
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                      Omslag
                    </span>
                    <Switch
                      checked={designSettings.coverEnabled}
                      onCheckedChange={(checked) =>
                        onDesignSettingsChange({
                          ...designSettings,
                          coverEnabled: checked,
                        })
                      }
                      className="scale-75"
                    />
                  </div>
                  {designSettings.coverEnabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          Bakgrundsfärg
                        </Label>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/5">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-outline-variant/10 shadow-sm">
                            <input
                              type="color"
                              value={
                                designSettings.coverBackground || "#0F172A"
                              }
                              onChange={(event) =>
                                onDesignSettingsChange({
                                  ...designSettings,
                                  coverBackground: event.target.value,
                                })
                              }
                              className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer ring-0 outline-none"
                            />
                          </div>
                          <Input
                            value={designSettings.coverBackground || ""}
                            onChange={(event) =>
                              onDesignSettingsChange({
                                ...designSettings,
                                coverBackground: event.target.value,
                              })
                            }
                            className="border-none bg-transparent shadow-none font-black text-[10px] uppercase tracking-widest p-0 h-auto focus-visible:ring-0"
                            placeholder="#0F172A"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          Logotyp
                        </Label>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Label
                              htmlFor="cover-logo-upload"
                              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Ladda upp logga
                            </Label>
                            <input
                              id="cover-logo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }

                                void readImageAsDataUrl(file).then((logoUrl) => {
                                  onDesignSettingsChange({
                                    ...designSettings,
                                    logoUrl,
                                  });
                                });
                                event.target.value = "";
                              }}
                            />
                            {designSettings.logoUrl ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-xl border-outline-variant/10 text-[10px] font-black uppercase tracking-widest"
                                onClick={() =>
                                  onDesignSettingsChange({
                                    ...designSettings,
                                    logoUrl: "",
                                  })
                                }
                              >
                                Ta bort
                              </Button>
                            ) : null}
                          </div>
                          <Input
                            value={designSettings.logoUrl || ""}
                            onChange={(event) =>
                              onDesignSettingsChange({
                                ...designSettings,
                                logoUrl: event.target.value,
                              })
                            }
                            className="bg-surface-container-low/50 border-outline-variant/10 rounded-xl text-xs font-bold"
                            placeholder="Klistra in logotyp-URL om du vill..."
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          Huvudrubrik
                        </Label>
                        <Input
                          value={designSettings.coverHeadline || ""}
                          onChange={(event) =>
                            onDesignSettingsChange({
                              ...designSettings,
                              coverHeadline: event.target.value,
                            })
                          }
                          className="bg-surface-container-low/50 border-outline-variant/10 rounded-xl text-xs font-bold"
                          placeholder="Ditt förslag..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          Underrubrik
                        </Label>
                        <Input
                          value={designSettings.coverSubheadline || ""}
                          onChange={(event) =>
                            onDesignSettingsChange({
                              ...designSettings,
                              coverSubheadline: event.target.value,
                            })
                          }
                          className="bg-surface-container-low/50 border-outline-variant/10 rounded-xl text-xs font-bold"
                          placeholder="Kort beskrivning..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    Vibe & Effekter
                  </span>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black text-on-surface">Glassmorphism</Label>
                        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Suddig bakgrund (Blur)</p>
                      </div>
                      <Switch
                        checked={designSettings.glassmorphismEnabled}
                        onCheckedChange={(checked) =>
                          onDesignSettingsChange({
                            ...designSettings,
                            glassmorphismEnabled: checked,
                          })
                        }
                        className="scale-75"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black text-on-surface">Gradient Buttons</Label>
                        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Premium-gradienter</p>
                      </div>
                      <Switch
                        checked={designSettings.gradientEnabled}
                        onCheckedChange={(checked) =>
                          onDesignSettingsChange({
                            ...designSettings,
                            gradientEnabled: checked,
                          })
                        }
                        className="scale-75"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    Design-presets
                  </span>
                  <div className="grid gap-2">
                    {[
                      { id: "architectural", label: "Architectural", desc: "Clean & Geometrisk" },
                      { id: "editorial", label: "Editorial", desc: "Serif & Elegans" },
                      { id: "glass", label: "Jewel Glass", desc: "Ljusbrytande & Mjuk" },
                      { id: "minimal", label: "Pure Minimal", desc: "Spaciös & Subtil" },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-all duration-300",
                          designSettings.vibePreset === preset.id
                            ? "border-primary/20 bg-primary/[0.03] shadow-inner-primary scale-[1.02]"
                            : "border-outline-variant/5 bg-surface-container-low/50 hover:bg-surface-container-low",
                        )}
                        onClick={() =>
                          onDesignSettingsChange({
                            ...designSettings,
                            vibePreset: preset.id as any,
                            ...(preset.id === "glass" ? { glassmorphismEnabled: true, gradientEnabled: true } : {}),
                            ...(preset.id === "editorial" ? { fontPairing: "editorial" as any } : {}),
                          })
                        }
                      >
                        <p className="text-xs font-black text-on-surface uppercase tracking-tight">
                          {preset.label}
                        </p>
                        <p className="mt-1 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                          {preset.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Canvas Stage */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Superior Header - Invisible on scroll, minimal info */}
        <header className="shrink-0 px-4 py-4 sm:px-6 sm:py-5 xl:px-10 xl:py-8">
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-6">
              <Button
                variant="ghost"
                onClick={() => void onBack()}
                className="h-10 w-10 shrink-0 rounded-xl bg-white px-0 text-on-surface-variant/60 shadow-subtle hover:bg-white hover:text-on-surface sm:w-auto sm:px-4"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden xl:inline">Gå tillbaka</span>
              </Button>

              <div className="mx-1 hidden h-4 w-[1px] bg-outline-variant/10 sm:mx-2 sm:block" />

              <div className="min-w-0 flex-1 xl:max-w-[320px]">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Input
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    className="h-auto truncate border-none bg-transparent p-0 text-xl font-black tracking-tighter shadow-none placeholder:text-on-surface-variant/20 focus-visible:ring-0 md:text-2xl"
                  />
                  {status && (
                    <div className="shrink-0 scale-75 sm:scale-90">
                      <StatusBadge status={status} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
              {isPreview && (
                <div className="mx-auto flex items-center gap-1 rounded-2xl border border-outline-variant/5 bg-surface-container-low p-1 shadow-sm sm:mx-0 xl:absolute xl:left-1/2 xl:-translate-x-1/2">
                  {[
                    { id: "mobile", icon: Smartphone, label: "Mobil" },
                    { id: "tablet", icon: Tablet, label: "Padda" },
                    { id: "desktop", icon: Monitor, label: "Dator" },
                  ].map((device) => {
                    const Icon = device.icon;
                    const isActive = previewDevice === device.id;

                    return (
                      <button
                        key={device.id}
                        type="button"
                        onClick={() =>
                          setPreviewDevice(
                            device.id as "desktop" | "tablet" | "mobile",
                          )
                        }
                        className={cn(
                          "flex h-9 w-11 items-center justify-center rounded-xl transition-all duration-300 sm:w-12",
                          isActive
                            ? "bg-white text-primary shadow-subtle"
                            : "text-on-surface-variant/30 hover:bg-white/50 hover:text-on-surface-variant",
                        )}
                        title={device.label}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isActive ? "scale-110" : "scale-100",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex w-full items-center gap-2 rounded-2xl border border-outline-variant/5 bg-white/50 p-1 shadow-sm sm:w-auto">
                <button
                  onClick={() => setIsPreview(false)}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-all sm:flex-none sm:px-5",
                    !isPreview
                      ? "bg-white text-on-surface shadow-subtle"
                      : "text-on-surface-variant/40 hover:text-on-surface",
                  )}
                >
                  Editor
                </button>
                <button
                  onClick={() => setIsPreview(true)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-all sm:flex-none sm:px-5",
                    isPreview
                      ? "bg-white text-on-surface shadow-subtle"
                      : "text-on-surface-variant/40 hover:text-on-surface",
                  )}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Canvas Area */}
        <main
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar bg-surface-container-low/20",
            isCompactPreview ? "px-0 py-6" : "px-0 py-8 sm:px-6 md:px-10 md:py-12",
          )}
        >
          <div
            className={cn(
              "mx-auto transition-all duration-700 ease-in-out relative",
              isPreview && previewDevice === "mobile" && "max-w-[430px] w-full px-3",
              isPreview && previewDevice === "tablet" && "max-w-[820px] w-full",
              (!isPreview || previewDevice === "desktop") && "max-w-[1280px] w-full",
              designSettings.vibePreset === "editorial" && "vibe-editorial",
              designSettings.vibePreset === "architectural" && "vibe-architectural",
              designSettings.vibePreset === "minimal" && "vibe-minimal",
              (designSettings.glassmorphismEnabled || designSettings.vibePreset === "glass") && "vibe-glass",
            )}
          >
            {notice}
            {attentionPrompt}
            <Dialog
              open={isPartiesDialogOpen}
              onOpenChange={setIsPartiesDialogOpen}
            >
              <DialogContent className="max-h-[88vh] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto rounded-[2rem] border-none bg-surface p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
                <DialogHeader className="border-b border-outline-variant/10 px-5 py-5 sm:px-8 sm:py-6">
                  <DialogTitle className="text-2xl font-black tracking-tight text-on-surface">
                    Redigera parter
                  </DialogTitle>
                </DialogHeader>
                {parties && onPartiesChange ? (
                  <div className="p-5 sm:p-6 md:p-8">
                    <PartiesPanel parties={parties} onChange={onPartiesChange} />
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>

            {isPreview && (previewDevice === "mobile" || previewDevice === "tablet") && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-on-surface rounded-full z-50 flex items-center justify-center gap-1.5 opacity-20 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-surface/20" />
                <div className="w-10 h-1 bg-surface/20 rounded-full" />
              </div>
            )}

            <div
              className={cn(
                "overflow-hidden transition-all duration-700",
                "rounded-none sm:rounded-[3rem] border border-outline-variant/10 bg-white",
                isPreview
                  ? "scale-100 shadow-none sm:shadow-elevated"
                  : "scale-[0.99] ring-1 ring-outline-variant/20 shadow-elevated",
                isPreview && previewDevice === "mobile" && "rounded-[3rem] ring-[10px] ring-on-surface ring-offset-2 shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_32px_56px_-18px_rgba(0,0,0,0.28)] mt-6 mb-14",
                isPreview && previewDevice === "tablet" && "rounded-[2.5rem] ring-[16px] ring-on-surface ring-offset-2 shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_40px_80px_-20px_rgba(0,0,0,0.3)] mt-8 mb-20",
              )}
              style={{ fontFamily: styles.fontFamily }}
              onClick={() => setSelectedBlock(null)}
            >
                {designSettings.coverEnabled && (
                  <section
                    id="cover-section"
                    className={cn(
                      "relative overflow-hidden group cursor-pointer",
                      isCompactPreview
                        ? "px-5 py-14"
                        : isTabletPreview
                          ? "px-10 py-20"
                          : "px-6 py-24 md:px-14 md:py-32",
                    )}
                    style={{
                      background:
                        designSettings.coverBackground ||
                        `linear-gradient(135deg, ${designSettings.accentColor}, #0F172A)`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedBlock({ type: "cover" });
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-5" />
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
                        backgroundSize: "24px 24px",
                      }}
                    />

                    <div className="relative text-white">
                      <div
                        className={cn(
                          "mb-16 flex",
                          designSettings.logoPosition === "center"
                            ? "justify-center"
                            : designSettings.logoPosition === "right"
                              ? "justify-end"
                              : "justify-start",
                        )}
                      >
                        {designSettings.logoUrl ? (
                          <div className="rounded-[1.35rem] bg-white/96 px-4 py-3 shadow-[0_14px_32px_-18px_rgba(0,0,0,0.55)] backdrop-blur">
                            <img
                              src={designSettings.logoUrl}
                              alt="Logo"
                              className="h-10 w-auto max-w-[180px] object-contain md:h-14 md:max-w-[240px]"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                            <Palette className="h-6 w-6 text-white/40" />
                          </div>
                        )}
                      </div>

                      <h1
                        className={cn(
                          "max-w-4xl font-black leading-[0.9] tracking-[-0.04em] font-display",
                          isCompactPreview
                            ? "text-[2.7rem]"
                            : isTabletPreview
                              ? "text-6xl"
                              : "text-5xl md:text-8xl",
                        )}
                        style={{ fontFamily: "var(--proposal-heading-font)" }}
                      >
                        {resolveDynamicText(
                          designSettings.coverHeadline ||
                            title ||
                            "Ett exklusivt förslag",
                          placeholderContext,
                        )}
                      </h1>

                      <div
                        className="mt-12 w-20 h-2 rounded-full"
                        style={{ backgroundColor: designSettings.accentColor }}
                      />

                      <p
                        className={cn(
                          "mt-12 max-w-2xl font-medium text-white/70 leading-relaxed",
                          isCompactPreview
                            ? "text-base"
                            : isTabletPreview
                              ? "text-lg"
                              : "text-xl md:text-2xl",
                        )}
                      >
                        {resolveDynamicText(
                          designSettings.coverSubheadline ||
                            (mode === "template"
                              ? "Designa din perfekta mall för framtida samarbeten."
                              : "Här är visionen vi skapat för ert kommande projekt."),
                          placeholderContext,
                        )}
                      </p>

                      <div
                        className={cn(
                          "mt-20 flex flex-wrap gap-y-6 border-t border-white/10",
                          isCompactPreview
                            ? "gap-x-6 pt-8"
                            : "gap-x-12 pt-12",
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            Mottagare
                          </p>
                          <p className="text-lg font-bold text-white/90">
                            {resolveDynamicText(
                              clientName || "Namnlös kund",
                              placeholderContext,
                            )}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            Referensnummer
                          </p>
                          <p className="text-lg font-bold text-white/90">
                            #OFF-{format(new Date(), "yyyy-MM")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            Giltig till
                          </p>
                          <p className="text-lg font-bold text-white/90">
                            {format(
                              createdAt ? new Date(createdAt) : new Date(),
                              "d MMM yyyy",
                              { locale: sv },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <div
                  className={cn(
                    "space-y-20",
                    isCompactPreview
                      ? "px-5 py-10"
                      : isTabletPreview
                        ? "px-10 py-14"
                        : "px-6 py-16 md:px-14 md:py-24",
                  )}
                >
                  {canvasSections.map((section, sectionIndex) => (
                    <div key={section.id} id={`section-${section.id}`}>
                      {sectionIndex > 0 && (
                        <SectionDivider designSettings={designSettings} />
                      )}

                      <section
                        className="group/section"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {isPartiesSection(section) && parties ? (
                          <div
                            className={cn(
                              "rounded-[2.5rem] transition-all duration-300",
                              selectedBlock?.type === "parties" &&
                                !isPreview &&
                                "ring-4 ring-primary/10 shadow-elevated",
                            )}
                          >
                            {isPreview ? (
                              <PartyCover
                                parties={parties}
                                designSettings={designSettings}
                                className="mb-0"
                                isCompact={isCompactPreview}
                              />
                            ) : (
                              <PartiesInlineCard
                                parties={parties}
                                designSettings={designSettings}
                                onOpen={() => {
                                  setSelectedBlock({ type: "parties" });
                                  setIsPartiesDialogOpen(true);
                                }}
                              />
                            )}
                          </div>
                        ) : isPreview ? (
                          section.title && (
                            <h2
                              className={cn(
                                "mb-10 text-on-surface",
                                getHeadingTypography(2),
                              )}
                              style={{
                                fontFamily: "var(--proposal-heading-font)",
                              }}
                            >
                              {resolveDynamicText(
                                section.title,
                                placeholderContext,
                              )}
                            </h2>
                          )
                        ) : (
                          <div className="mb-10 flex items-center justify-between gap-4">
                            <AutoGrowTextarea
                              value={section.title}
                              onChange={(value) =>
                                updateSections((current) =>
                                  current.map((entry) =>
                                    entry.id === section.id
                                      ? { ...entry, title: value }
                                      : entry,
                                  ),
                                )
                              }
                              minRows={1}
                              style={{
                                fontFamily: "var(--proposal-heading-font)",
                              }}
                              className={cn(
                                "p-0 text-on-surface placeholder:text-on-surface-variant/20",
                                getHeadingTypography(2),
                              )}
                              placeholder="Namge denna sektion..."
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover/section:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-error/40 hover:text-error h-8"
                              onClick={() =>
                                updateSections(
                                  canvasSections.filter(
                                    (entry) => entry.id !== section.id,
                                  ),
                                )
                              }
                            >
                              Ta bort sektion
                            </Button>
                          </div>
                        )}

                        {!isPartiesSection(section) ? (
                          <div className="space-y-8">
                          {section.blocks.map((block) => {
                            const isSelected =
                              selectedBlock?.type === "block" &&
                              selectedBlock.sectionId === section.id &&
                              selectedBlock.blockId === block.id;

                            return (
                              <div
                                key={block.id}
                                className={cn(
                                  "rounded-[2.5rem] transition-all duration-300",
                                  isSelected &&
                                    !isPreview &&
                                    "ring-4 ring-primary/10 shadow-elevated",
                                )}
                                onClick={() =>
                                  !isPreview &&
                                  setSelectedBlock({
                                    type: "block",
                                    sectionId: section.id,
                                    blockId: block.id,
                                  })
                                }
                              >
                                <BlockEditor
                                  block={block}
                                  isPreview={isPreview}
                                  isTemplateMode={mode === "template"}
                                  designSettings={designSettings}
                                  placeholderContext={placeholderContext}
                                  previewDevice={previewDevice}
                                  onDelete={() =>
                                    updateSections((current) =>
                                      current.map((entry) =>
                                        entry.id !== section.id
                                          ? entry
                                          : {
                                              ...entry,
                                              blocks: entry.blocks.filter(
                                                (entryBlock) =>
                                                  entryBlock.id !== block.id,
                                              ),
                                            },
                                      ),
                                    )
                                  }
                                  onChange={(updates) =>
                                    updateBlock(section.id, block.id, updates)
                                  }
                                />
                              </div>
                            );
                          })}
                          </div>
                        ) : null}

                        {!isPreview && !isPartiesSection(section) && (
                          <div className="mt-12 flex flex-wrap gap-2.5 p-6 rounded-[2.5rem] bg-surface-container-low/30 border border-dashed border-outline-variant/10">
                            {[
                              {
                                type: "heading" as const,
                                icon: <Heading className="h-4 w-4" />,
                                label: "Rubrik",
                              },
                              {
                                type: "text" as const,
                                icon: <Type className="h-4 w-4" />,
                                label: "Brödtext",
                              },
                              {
                                type: "image" as const,
                                icon: <ImageIcon className="h-4 w-4" />,
                                label: "Bild",
                              },
                              {
                                type: "pricing" as const,
                                icon: <Table className="h-4 w-4" />,
                                label: "Pristabell",
                              },
                              {
                                type: "divider" as const,
                                icon: <Minus className="h-4 w-4" />,
                                label: "Avdelare",
                              },
                            ].map((entry) => (
                              <Button
                                key={entry.type}
                                type="button"
                                variant="outline"
                                className="h-10 rounded-xl bg-white border-outline-variant/10 shadow-sm text-[11px] font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
                                onClick={() =>
                                  updateSections((current) =>
                                    current.map((currentSection) =>
                                      currentSection.id !== section.id
                                        ? currentSection
                                        : {
                                            ...currentSection,
                                            blocks: [
                                              ...currentSection.blocks,
                                              createBlock(entry.type),
                                            ],
                                          },
                                    ),
                                  )
                                }
                              >
                                {entry.icon}
                                <span className="ml-2">{entry.label}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  ))}
                </div>

                {isProposalPreview ? (
                  <div
                    className={cn(
                      "border-t border-outline-variant/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]",
                      isCompactPreview
                        ? "px-5 py-8"
                        : isTabletPreview
                          ? "px-10 py-10"
                          : "px-6 py-12 md:px-14 md:py-14",
                    )}
                  >
                    <div className="mx-auto max-w-3xl">
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant shadow-subtle">
                        <Eye className="h-3.5 w-3.5" />
                        Kundvy i preview
                      </div>

                      {isAcceptedProposal ? (
                        <div
                          className={cn(
                            "rounded-[2.5rem] border border-emerald-200 bg-emerald-50/70 text-center",
                            isCompactPreview ? "p-6" : "p-8",
                          )}
                        >
                          <div
                            className={cn(
                              "mx-auto mb-4 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700",
                              isCompactPreview ? "h-12 w-12" : "h-14 w-14",
                            )}
                          >
                            <CheckCircle2 className={cn(isCompactPreview ? "h-6 w-6" : "h-7 w-7")} />
                          </div>
                          <h3
                            className={cn(
                              "font-black tracking-tight text-emerald-950",
                              isCompactPreview ? "text-2xl" : "text-3xl",
                            )}
                          >
                            Offerten är signerad
                          </h3>
                          <p
                            className={cn(
                              "mx-auto mt-3 max-w-2xl text-emerald-900/75",
                              isCompactPreview ? "text-sm leading-6" : "text-base leading-7",
                            )}
                          >
                            Så här ser slutläget ut för kunden efter att offerten har accepterats och signerats.
                          </p>
                        </div>
                      ) : isDeclinedProposal ? (
                        <div
                          className={cn(
                            "rounded-[2.5rem] border border-rose-200 bg-rose-50/70 text-center",
                            isCompactPreview ? "p-6" : "p-8",
                          )}
                        >
                          <div
                            className={cn(
                              "mx-auto mb-4 flex items-center justify-center rounded-full bg-rose-100 text-rose-700",
                              isCompactPreview ? "h-12 w-12" : "h-14 w-14",
                            )}
                          >
                            <XCircle className={cn(isCompactPreview ? "h-6 w-6" : "h-7 w-7")} />
                          </div>
                          <h3
                            className={cn(
                              "font-black tracking-tight text-rose-950",
                              isCompactPreview ? "text-2xl" : "text-3xl",
                            )}
                          >
                            Offerten är avböjd
                          </h3>
                          <p
                            className={cn(
                              "mx-auto mt-3 max-w-2xl text-rose-900/70",
                              isCompactPreview ? "text-sm leading-6" : "text-base leading-7",
                            )}
                          >
                            Kunden ser här att offerten inte längre väntar på svar och att dialogen behöver tas vidare utanför signeringsflödet.
                          </p>
                        </div>
                      ) : isAwaitingProposalResponse ? (
                        <div
                          className={cn(
                            "rounded-[2.5rem] border border-primary/15 bg-white text-center shadow-[0_20px_50px_-18px_rgba(0,0,0,0.12)]",
                            isCompactPreview ? "p-5" : "p-8",
                          )}
                        >
                          <h3
                            className={cn(
                              "font-black tracking-tight text-on-surface",
                              isCompactPreview ? "text-[2rem] leading-[1.02]" : "text-3xl",
                            )}
                          >
                            Redo att gå vidare?
                          </h3>
                          <p
                            className={cn(
                              "mx-auto mt-4 max-w-2xl text-on-surface-variant/75",
                              isCompactPreview ? "text-sm leading-6" : "text-base leading-7",
                            )}
                          >
                            Här ser avsändaren exakt hur kundens svarszon landar längst ner i offerten. Kunden kan signera direkt eller markera att något behöver ändras.
                          </p>
                          <div
                            className={cn(
                              "mt-8 flex justify-center gap-3",
                              isCompactPreview
                                ? "flex-col items-stretch"
                                : "flex-col items-center gap-4 sm:flex-row",
                            )}
                          >
                            <button
                              type="button"
                              disabled
                              className={cn(
                                "inline-flex items-center justify-center rounded-2xl bg-primary font-black uppercase text-white shadow-elevated-primary opacity-100",
                                isCompactPreview
                                  ? "h-14 w-full px-5 text-base tracking-[0.12em]"
                                  : "h-16 px-10 text-lg tracking-[0.16em]",
                              )}
                            >
                              <Send className={cn("mr-3", isCompactPreview ? "h-4 w-4" : "h-5 w-5")} />
                              Signera & Acceptera
                            </button>
                            <button
                              type="button"
                              disabled
                              className={cn(
                                "inline-flex items-center justify-center rounded-2xl font-black uppercase text-on-surface-variant/50",
                                isCompactPreview
                                  ? "h-12 w-full border border-outline-variant/10 bg-surface-container-low/40 px-4 text-[11px] tracking-[0.14em]"
                                  : "h-16 px-8 text-sm tracking-[0.16em]",
                              )}
                            >
                              <XCircle className={cn("mr-3", isCompactPreview ? "h-3.5 w-3.5" : "h-4 w-4")} />
                              Behöver ändras
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "rounded-[2.5rem] border border-outline-variant/10 bg-surface-container-low/40 text-center",
                            isCompactPreview ? "p-6" : "p-8",
                          )}
                        >
                          <h3
                            className={cn(
                              "font-black tracking-tight text-on-surface",
                              isCompactPreview ? "text-xl" : "text-2xl",
                            )}
                          >
                            Kundens svarsyta visas här efter utskick
                          </h3>
                          <p
                            className={cn(
                              "mx-auto mt-3 max-w-2xl text-on-surface-variant/70",
                              isCompactPreview ? "text-sm leading-6" : "text-base leading-7",
                            )}
                          >
                            När offerten skickas visas signeringsknapp, status och svarszon i previewn på samma plats längst ner i dokumentet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </main>

          {/* Floating Action Bar / Mobile Sidepanel */}
          {!isMobile ? (
            <div
              className={cn(
                "absolute bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-700 transition-all",
                isPreview && "opacity-0 translate-y-10 pointer-events-none",
              )}
            >
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-2xl px-6 py-4 rounded-[2.5rem] border border-white/20 shadow-elevated ring-1 ring-black/5">
                {secondaryAction && (
                  <Button
                    variant="ghost"
                    onClick={() => void secondaryAction.onClick()}
                    disabled={secondaryAction.loading}
                    className="h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface hover:bg-white"
                  >
                    {secondaryAction.loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-3">
                        {secondaryAction.icon}
                        {secondaryAction.label}
                      </div>
                    )}
                  </Button>
                )}

                {!readOnly ? (
                  <Button
                    variant="outline"
                    onClick={() => void onSave()}
                    disabled={isSaving}
                    className="h-14 px-8 rounded-2xl bg-white border-outline-variant/10 shadow-sm text-[11px] font-black uppercase tracking-widest hover:bg-surface-container-low"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-3">
                        <Save className="h-4 w-4" />
                        {mode === "template" ? "Spara Mall" : "Spara Utkast"}
                      </div>
                    )}
                  </Button>
                ) : null}

                {primaryAction && (
                  <Button
                    onClick={() => void primaryAction.onClick()}
                    disabled={primaryAction.loading}
                    className="h-14 px-10 rounded-2xl bg-primary text-white shadow-elevated-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {primaryAction.loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-3">
                        {primaryAction.icon || <Save className="h-4 w-4" />}
                        {primaryAction.label}
                      </div>
                    )}
                  </Button>
                )}

                <div className="h-10 w-[1px] bg-outline-variant/10 mx-2" />

                <div className="px-6 py-2 rounded-2xl bg-surface-container-lowest/50 border border-outline-variant/5">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">
                    Totalvärde
                  </p>
                  <p className="text-xl font-black text-on-surface leading-none">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  className={cn(
                    "fixed right-6 top-1/2 -translate-y-1/2 z-50 h-16 w-16 rounded-full bg-primary text-white shadow-elevated-primary transition-all duration-500 hover:scale-105 active:scale-95",
                    isPreview && "opacity-0 translate-x-20 pointer-events-none",
                  )}
                >
                  <SquareMenu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] border-l-outline-variant/10 bg-surface p-0 sm:w-[400px]">
                <SheetHeader className="border-b border-outline-variant/10 px-6 py-8 text-left">
                  <SheetTitle className="text-2xl font-black tracking-tight text-on-surface">
                    Åtgärder
                  </SheetTitle>
                  <div className="mt-6 rounded-2xl bg-surface-container-low p-5 border border-outline-variant/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-2">
                      Totalvärde för offerten
                    </p>
                    <p className="text-3xl font-black text-primary">
                      {formatCurrency(totalValue)}
                    </p>
                  </div>
                </SheetHeader>

                <div className="flex flex-col gap-4 p-6">
                  {secondaryAction && (
                    <Button
                      variant="outline"
                      onClick={() => void secondaryAction.onClick()}
                      disabled={secondaryAction.loading}
                      className="h-16 w-full justify-start rounded-2xl bg-white border-outline-variant/10 px-6 text-[11px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-low"
                    >
                      {secondaryAction.loading ? (
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      ) : (
                        <div className="mr-3 text-on-surface-variant/40">
                          {secondaryAction.icon}
                        </div>
                      )}
                      {secondaryAction.label}
                    </Button>
                  )}

                  {!readOnly ? (
                    <Button
                      variant="outline"
                      onClick={() => void onSave()}
                      disabled={isSaving}
                      className="h-16 w-full justify-start rounded-2xl bg-white border-outline-variant/10 px-6 text-[11px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-low"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="mr-3 h-5 w-5 text-on-surface-variant/40" />
                      )}
                      {mode === "template" ? "Spara Mall" : "Spara Utkast"}
                    </Button>
                  ) : null}

                  {primaryAction && (
                    <Button
                      onClick={() => void primaryAction.onClick()}
                      disabled={primaryAction.loading}
                      className="h-16 w-full justify-start rounded-2xl bg-primary px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-elevated-primary hover:bg-primary/90"
                    >
                      {primaryAction.loading ? (
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      ) : (
                        <div className="mr-3">
                          {primaryAction.icon || <Save className="h-5 w-5" />}
                        </div>
                      )}
                      {primaryAction.label}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    );
}
