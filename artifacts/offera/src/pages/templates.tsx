import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Plus, Search } from "lucide-react";
import type { Template } from "@workspace/api-zod";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { filterTemplates, TEMPLATE_CATEGORY_LABELS } from "@/lib/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateCard } from "@/components/template-card";
import { TemplatePreviewDialog } from "@/components/template-preview-dialog";
import { useConfirm } from "@/components/ui/custom-confirm";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] =
    React.useState<keyof typeof TEMPLATE_CATEGORY_LABELS>("alla");
  const [isCreating, setIsCreating] = React.useState(false);
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(
    null,
  );

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    enabled: isAuthenticated && !isAuthLoading,
  });

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-error/15 bg-white p-10 text-center shadow-subtle">
        <h2 className="text-2xl font-black tracking-tight text-on-surface">
          Kunde inte ladda mallarna
        </h2>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant/70">
          {error instanceof Error ? error.message : "Försök ladda om sidan."}
        </p>
      </div>
    );
  }

  const filtered = filterTemplates(templates, { category, search });
  const builtInTemplates = filtered.filter((template) => template.isBuiltIn);
  const customTemplates = filtered.filter((template) => !template.isBuiltIn);

  const handleDelete = async (template: Template) => {
    const isConfirmed = await confirm({
      title: "Radera mall?",
      description:
        template.usageCount > 0
          ? `Denna mall har använts för ${template.usageCount} offerter. Om du raderar den påverkas inte befintliga offerter.`
          : "Är du säker på att du vill radera denna mall permanent?",
      confirmLabel: "Radera mall",
      variant: "destructive",
    });

    if (!isConfirmed) return;

    try {
      await api.deleteTemplate(template.id);
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Mall raderad" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte radera mallen",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    }
  };

  const handleCopy = async (template: Template) => {
    try {
      const copy = await api.copyTemplate(template.id);
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setLocation(`/templates/${copy.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte kopiera mallen",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    }
  };

  const handleCreateProposal = async (templateId?: number) => {
    setIsCreating(true);
    try {
      const proposal = await api.createProposal({
        title: templateId ? "Ny offert från mall" : "Ny offert",
        clientName: "",
        templateId,
      });

      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Offert skapad",
        description: "Vi öppnar nu byggaren åt dig.",
      });
      setLocation(`/proposal/${proposal.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte skapa offert",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Search and Header Section */}
      <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between bg-white p-8 md:p-10 rounded-[2.5rem] shadow-subtle border border-outline-variant/10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-8 bg-primary rounded-full" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Skapa nytt
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface">
            Vad vill du skapa idag?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-on-surface-variant/70 leading-relaxed font-medium">
            Börja från ett tomt blad eller välj en av de professionella mallarna
            nedan för att komma igång snabbare.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {(
              Object.keys(TEMPLATE_CATEGORY_LABELS) as Array<
                keyof typeof TEMPLATE_CATEGORY_LABELS
              >
            ).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setCategory(entry)}
                className={cn(
                  "rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-300 transform active:scale-95",
                  category === entry
                    ? "bg-primary text-white shadow-elevated-primary scale-105 z-10"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
                )}
              >
                {TEMPLATE_CATEGORY_LABELS[entry]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row items-center pt-4 lg:pt-0">
          <div className="relative group w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hitta en mall..."
              className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-sm"
            />
          </div>
          <Button
            disabled={isCreating}
            onClick={() => setLocation("/templates/new")}
            className="h-14 px-8 rounded-2xl bg-primary-gradient w-full sm:w-auto font-black shadow-elevated-primary text-base"
          >
            <Plus className="mr-2 h-6 w-6" />
            Ny mall
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-bold text-primary animate-pulse uppercase tracking-widest text-xs">
              Förbereder din nya offert...
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
          <p className="text-on-surface-variant font-bold animate-pulse uppercase tracking-[0.2em] text-xs">
            Hämtar biblioteket...
          </p>
        </div>
      ) : (
        <div className="space-y-24 pb-20">
          {/* Custom Templates Section */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-outline-variant/10 pb-8 gap-4">
              <div>
                <h2 className="text-3xl font-black text-on-surface tracking-tighter">
                  Dina anpassade mallar
                </h2>
                <p className="text-xs font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mt-2">
                  Exklusivt för din verksamhet
                </p>
              </div>
            </div>

            {customTemplates.length === 0 ? (
              <div className="rounded-[4rem] border-2 border-dashed border-outline-variant/20 bg-surface-container-low/20 p-24 text-center">
                <div className="mx-auto mb-10 flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-white shadow-elevated border border-outline-variant/5 rotate-3">
                  <Plus className="h-14 w-14 text-primary/20" />
                </div>
                <h3 className="text-3xl font-black tracking-tight text-on-surface">
                  Tomt i biblioteket
                </h3>
                <p className="mx-auto mt-6 max-w-md text-on-surface-variant/70 text-lg leading-relaxed font-medium">
                  Du har inga egna mallar än. Börja bygga din första mall för
                  att skala upp din säljprocess.
                </p>
                <Button
                  className="mt-12 h-16 px-12 rounded-2xl bg-primary-gradient font-black shadow-elevated-primary text-lg"
                  onClick={() => setLocation("/templates/new")}
                >
                  <Plus className="mr-2 h-7 w-7" />
                  Skapa din första mall
                </Button>
              </div>
            ) : (
              <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                {/* Blank Proposal Card */}
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => handleCreateProposal()}
                  className="group relative flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5 p-12 transition-all hover:bg-primary/10 hover:border-primary/40 hover:scale-[1.02] active:scale-95 duration-500"
                >
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white shadow-elevated transition-transform duration-500 group-hover:rotate-12">
                    <Plus className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-on-surface">
                    Blank Offert
                  </h3>
                  <p className="mt-2 text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    Starta från scratch
                  </p>
                </button>

                {customTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleCreateProposal(template.id)}
                    onEdit={() => setLocation(`/templates/${template.id}`)}
                    onDelete={handleDelete}
                    onPreview={setPreviewTemplate}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Built-in Templates Section */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-outline-variant/10 pb-8 gap-4">
              <div>
                <h2 className="text-3xl font-black text-on-surface tracking-tighter">
                  Offera Core-mallar
                </h2>
                <p className="text-xs font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mt-2">
                  Beprövade koncept för snabbstart
                </p>
              </div>
            </div>

            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {builtInTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => handleCreateProposal(template.id)}
                  onCopy={handleCopy}
                  onPreview={setPreviewTemplate}
                />
              ))}
            </div>
          </section>

          <div className="flex justify-center border-t border-outline-variant/10 pt-16">
            <Button
              variant="ghost"
              className="font-black text-on-surface-variant hover:text-primary transition-all hover:bg-primary/5 rounded-2xl px-12 h-14 uppercase tracking-widest text-xs"
              onClick={() => setLocation("/")}
            >
              Tillbaka till arbetsbordet
            </Button>
          </div>
        </div>
      )}

      <TemplatePreviewDialog
        template={previewTemplate}
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
          }
        }}
      />
    </div>
  );
}
