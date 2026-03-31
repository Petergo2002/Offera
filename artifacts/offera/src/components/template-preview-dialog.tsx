import React from "react";
import { Eye, Layers3, Sparkles } from "lucide-react";
import type { ContentBlock, Template } from "@workspace/api-zod";
import {
  calculatePricingTotals,
  formatCurrency,
  getFontStyles,
  normalizeDesignSettings,
  resolveDynamicText,
} from "@/lib/document";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplatePreviewDialogProps = {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MOCK_PREVIEW_CONTEXT = {
  clientName: "Agentergroup AB",
  clientEmail: "hej@agentergroup.com",
  createdAt: new Date("2026-03-31T10:00:00.000Z"),
  serviceName: "Ny hemsida + SEO",
  title: "Ny hemsida + SEO",
};

function PreviewPricingBlock({ block }: { block: ContentBlock }) {
  const totals = calculatePricingTotals(block);
  const description = "description" in block ? block.description : undefined;

  return (
    <div className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest">
      {description ? (
        <div className="border-b border-outline-variant/10 px-6 py-5">
          <p className="text-sm leading-6 text-on-surface-variant/75">
            {description}
          </p>
        </div>
      ) : null}

      <div className="space-y-4 px-6 py-6">
        {totals.rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-3 rounded-2xl border border-outline-variant/10 bg-white px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <div className="min-w-0">
              <p className="font-semibold text-on-surface">{row.description}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant/45">
                {row.type === "recurring"
                  ? row.interval === "yearly"
                    ? "Löpande / år"
                    : "Löpande / månad"
                  : "Engång"}
                {(row.bindingPeriod ?? 0) > 0
                  ? ` · ${row.bindingPeriod} mån bindning`
                  : ""}
              </p>
            </div>
            <div className="text-sm text-on-surface-variant/70 md:text-right">
              {row.quantity} {row.unit}
            </div>
            <div className="text-sm font-semibold text-on-surface md:text-right">
              {formatCurrency(row.total)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-t border-outline-variant/10 bg-surface-container-low px-6 py-5 md:grid-cols-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/45">
            Engång
          </p>
          <p className="mt-2 text-lg font-black text-on-surface">
            {formatCurrency(totals.setupTotal)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/45">
            Löpande
          </p>
          <p className="mt-2 text-lg font-black text-on-surface">
            {totals.hasRecurring
              ? `${formatCurrency(totals.monthlyEquivalent)} / mån`
              : "Ingen"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/45">
            {totals.totalLabel}
          </p>
          <p className="mt-2 text-lg font-black text-on-surface">
            {formatCurrency(totals.hasRecurring ? totals.contractTotal : totals.total)}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/55">
            {totals.totalSubtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: TemplatePreviewDialogProps) {
  if (!template) {
    return null;
  }

  const designSettings = normalizeDesignSettings(template.designSettings);
  const styles = getFontStyles(designSettings);
  const coverHeadline = resolveDynamicText(
    designSettings.coverHeadline || `Offert för ${template.name}`,
    MOCK_PREVIEW_CONTEXT,
  );
  const coverSubheadline = resolveDynamicText(
    designSettings.coverSubheadline ||
      template.description ||
      "Förhandsgranska hur mallen kommer att kännas med mockdata.",
    MOCK_PREVIEW_CONTEXT,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl border-none bg-white p-0 shadow-elevated sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-outline-variant/10 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-none bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              Förhandsgranskning
            </Badge>
            <Badge className="border-none bg-surface-container-low px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
              Mockdata
            </Badge>
          </div>
          <DialogTitle className="mt-3 text-3xl font-black tracking-tight text-on-surface">
            {template.name}
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm leading-6 text-on-surface-variant/70">
            Så här kan mallen se ut för en kund med exempeldata innan du skapar
            en riktig offert.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto bg-surface-container-low/30 px-3 py-3 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div
            className="mx-auto w-full max-w-4xl rounded-[2.5rem] border border-outline-variant/10 bg-white shadow-subtle"
            style={styles}
          >
            {designSettings.coverEnabled ? (
              <section
                className="relative overflow-hidden rounded-t-[2.5rem] px-6 py-10 text-white sm:px-8 sm:py-12 md:px-12 md:py-16"
                style={{ background: designSettings.coverBackground }}
              >
                <div className="absolute inset-0 opacity-[0.08]">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,white,transparent_36%)]" />
                </div>
                <div className="relative space-y-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 backdrop-blur">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">
                        Mallpreview
                      </p>
                      <p className="mt-1 text-sm font-medium text-white/80">
                        Demo för {MOCK_PREVIEW_CONTEXT.clientName}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <h2
                      className="max-w-3xl text-[2.35rem] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-4xl md:text-6xl"
                      style={{ fontFamily: "var(--proposal-heading-font)" }}
                    >
                      {coverHeadline}
                    </h2>
                    <p
                      className="max-w-2xl text-sm leading-7 text-white/80 sm:text-base md:text-xl"
                      style={{ fontFamily: "var(--proposal-body-font)" }}
                    >
                      {coverSubheadline}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Kund
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {MOCK_PREVIEW_CONTEXT.clientName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Tjänst
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {MOCK_PREVIEW_CONTEXT.serviceName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Sektioner
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {template.sections.length} st
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="space-y-10 px-6 py-8 sm:px-8 sm:py-10 md:space-y-12 md:px-12 md:py-12">
              {template.sections.map((section, sectionIndex) => (
                <section key={section.id} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-1.5 w-8 rounded-full"
                      style={{ backgroundColor: designSettings.accentColor }}
                    />
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-on-surface-variant/45">
                      Sektion {sectionIndex + 1}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <h3
                      className="text-[1.65rem] font-semibold leading-[1.04] tracking-[-0.035em] text-on-surface sm:text-[2rem]"
                      style={{ fontFamily: "var(--proposal-heading-font)" }}
                    >
                      {resolveDynamicText(section.title, MOCK_PREVIEW_CONTEXT)}
                    </h3>

                    {section.blocks.map((block) => {
                      if (block.type === "heading") {
                        const Tag =
                          block.level === 1 ? "h1" : block.level === 3 ? "h3" : "h2";
                        const className =
                          block.level === 1
                            ? "text-4xl leading-[0.98] tracking-[-0.04em]"
                            : block.level === 3
                              ? "text-xl leading-[1.18] tracking-[-0.025em]"
                              : "text-[2rem] leading-[1.04] tracking-[-0.035em]";

                        return (
                          <Tag
                            key={block.id}
                            className={className + " font-semibold text-on-surface"}
                            style={{ fontFamily: "var(--proposal-heading-font)" }}
                          >
                            {resolveDynamicText(
                              block.content || "",
                              MOCK_PREVIEW_CONTEXT,
                            )}
                          </Tag>
                        );
                      }

                      if (block.type === "text") {
                        return (
                          <p
                            key={block.id}
                            className="whitespace-pre-wrap text-[1.02rem] leading-8 text-on-surface-variant/85"
                            style={{ fontFamily: "var(--proposal-body-font)" }}
                          >
                            {resolveDynamicText(
                              block.content || "",
                              MOCK_PREVIEW_CONTEXT,
                            )}
                          </p>
                        );
                      }

                      if (block.type === "pricing") {
                        return <PreviewPricingBlock key={block.id} block={block} />;
                      }

                      if (block.type === "image") {
                        return block.imageUrl ? (
                          <img
                            key={block.id}
                            src={block.imageUrl}
                            alt=""
                            className="w-full rounded-[1.75rem] border border-outline-variant/10 object-cover"
                          />
                        ) : (
                          <div
                            key={block.id}
                            className="flex h-48 items-center justify-center rounded-[1.75rem] border border-dashed border-outline-variant/15 bg-surface-container-low text-on-surface-variant/50"
                          >
                            <div className="text-center">
                              <Layers3 className="mx-auto h-8 w-8" />
                              <p className="mt-3 text-sm font-medium">
                                Bildblock utan uppladdad bild
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="border-t border-outline-variant/10 bg-surface-container-low/40 px-8 py-6 md:px-12">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/45">
                    Previewnotis
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant/70">
                    Det här är en förhandsgranskning med mockdata. Riktiga
                    kunduppgifter, priser och avtalsparter fylls i först när du
                    använder mallen i en riktig offert.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-subtle">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-on-surface-variant/70">
                    WYSIWYG nära slutresultatet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
