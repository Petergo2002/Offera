import React from "react";
import {
  Clock,
  CopyPlus,
  Eye,
  FileText,
  Layers,
  PencilLine,
  Play,
  Trash2,
} from "lucide-react";
import type { Template } from "@/lib/api";
import { formatDate, getTemplateCategoryLabel } from "@/lib/document";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TemplateCardProps = {
  template: Template;
  onUse: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onCopy?: (template: Template) => void;
  onPreview?: (template: Template) => void;
  compact?: boolean;
  selected?: boolean;
};

export function TemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
  onCopy,
  onPreview,
  compact = false,
  selected = false,
}: TemplateCardProps) {
  const accentColor = template.designSettings.accentColor || "#3b82f6";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-700 font-sans",
        compact
          ? "rounded-[2rem] p-1.5 shadow-subtle hover:shadow-elevated hover:-translate-y-1.5"
          : "rounded-[2.5rem] p-2 shadow-subtle hover:shadow-elevated hover:-translate-y-2",
        selected
          ? "border-primary ring-2 ring-primary/10 shadow-elevated-primary"
          : "border border-outline-variant/10 bg-white",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-surface-container-low transition-transform duration-700 group-hover:scale-[1.02]",
          compact
            ? "aspect-[16/9] rounded-[1.5rem]"
            : "aspect-[16/10] rounded-[2rem]",
        )}
        style={{
          background:
            template.designSettings.coverBackground ||
            `linear-gradient(145deg, ${accentColor}, #000)`,
        }}
      >
        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-end",
            compact ? "p-4" : "p-8",
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <Badge className="border-none bg-white/20 text-white backdrop-blur-md px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider">
              {getTemplateCategoryLabel(template.category)}
            </Badge>
            {template.isBuiltIn && (
              <Badge className="border-none bg-primary/30 text-white backdrop-blur-md px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider">
                Core
              </Badge>
            )}
          </div>

          <h3
            className={cn(
              "font-black text-white tracking-tighter drop-shadow-sm group-hover:translate-x-1 transition-transform duration-500",
              compact ? "text-lg leading-tight" : "text-2xl",
            )}
          >
            {template.name}
          </h3>
        </div>

        {/* Quick Play Action (Hover Only) */}
        <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
          <Button
            size="lg"
            className="rounded-full h-16 w-16 bg-white text-primary shadow-elevated hover:scale-110 transition-transform active:scale-90"
            onClick={() => onUse(template)}
          >
            <Play className="fill-current ml-1" size={28} />
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          compact ? "p-4 pt-5" : "p-6 pt-8",
        )}
      >
        <p
          className={cn(
            "font-medium text-on-surface-variant/80 leading-relaxed",
            compact
              ? "line-clamp-1 text-xs min-h-0"
              : "line-clamp-2 text-sm min-h-[2.5rem]",
          )}
        >
          {template.description || "En kraftfull grund för din nästa offert."}
        </p>

        {!compact && (
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-outline-variant/5 pt-6">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-primary/40" />
                {formatDate(template.updatedAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <Layers size={12} className="text-primary/40" />
                {template.usageCount}
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "grid gap-2",
            compact ? "mt-4 grid-cols-1" : "mt-6 grid-cols-2",
          )}
        >
          {onPreview ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "rounded-xl border-outline-variant/10 font-bold hover:bg-surface-container-low",
                compact ? "h-10 text-[10px]" : "col-span-2 h-11 text-[11px]",
              )}
              onClick={() => onPreview(template)}
            >
              <Eye
                className={cn("mr-2", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
              />
              Förhandsgranska
            </Button>
          ) : null}

          {template.isBuiltIn ? (
            <Button
              type="button"
              variant="secondary"
              className={cn(
                "rounded-xl font-bold bg-surface-container-high/50 hover:bg-primary/5 hover:text-primary border-none shadow-none",
                compact ? "h-10 text-xs" : "h-12",
              )}
              onClick={() => onCopy?.(template)}
            >
              <CopyPlus
                className={cn("mr-2", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
              />
              Kopiera
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "rounded-xl font-bold border-outline-variant/10 hover:bg-surface-container-low px-2",
                compact ? "h-10 text-[10px]" : "h-12 text-[11px]",
              )}
              onClick={() => onEdit?.(template)}
            >
              <PencilLine
                className={cn("mr-2", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
              />
              Ändra
            </Button>
          )}

          <Button
            type="button"
            className={cn(
              "rounded-xl font-bold bg-on-surface text-surface hover:bg-primary shadow-subtle group/btn px-2 transition-all active:scale-95",
              compact ? "h-10 text-[10px]" : "h-12 text-[11px]",
            )}
            onClick={() => onUse(template)}
          >
            <FileText
              className={cn(
                "mr-1.5 transition-transform group-hover/btn:scale-110",
                compact ? "h-3.5 w-3.5" : "h-4 w-4",
              )}
            />
            Använd som mall
          </Button>

          {!template.isBuiltIn && onDelete && (
            <Button
              type="button"
              variant="ghost"
              className="col-span-2 h-10 text-[10px] font-black uppercase tracking-widest text-error/40 hover:text-error hover:bg-error/5 rounded-xl mt-1"
              onClick={() => onDelete(template)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Radera mall permanent
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
