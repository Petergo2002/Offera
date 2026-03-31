import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { CopyPlus, Loader2 } from "lucide-react";
import type {
  DocumentDesignSettings,
  ProposalSection,
  TemplateCategory,
} from "@workspace/api-zod";
import { DocumentBuilder, DocumentBuilderSkeleton } from "@/components/document-builder";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/custom-confirm";
import { useAuth } from "@/components/auth-provider";
import { createDefaultSections, DEFAULT_DESIGN_SETTINGS } from "@/lib/document";

type EditableTemplate = {
  name: string;
  description: string;
  category: TemplateCategory;
  sections: ProposalSection[];
  designSettings: DocumentDesignSettings;
};

function createNewTemplateDraft(): EditableTemplate {
  return {
    name: "Ny mall",
    description: "",
    category: "ovrigt",
    sections: createDefaultSections(),
    designSettings: {
      ...DEFAULT_DESIGN_SETTINGS,
      coverHeadline: "Offert för {{kundnamn}}",
      coverSubheadline: "Anpassa mallen för {{tjänst}}",
    },
  };
}

function serializeTemplateDraft(template: EditableTemplate) {
  return JSON.stringify(template);
}

export default function TemplateBuilderPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/templates/:id");
  const templateId = params?.id ? Number(params.id) : undefined;
  const isNewTemplate = !templateId || Number.isNaN(templateId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: loadedTemplate, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => api.getTemplate(templateId!),
    enabled: !isNewTemplate && isAuthenticated && !isAuthLoading,
  });

  const [draft, setDraft] = React.useState<EditableTemplate>(
    createNewTemplateDraft,
  );
  const [initialSnapshot, setInitialSnapshot] = React.useState(() =>
    serializeTemplateDraft(createNewTemplateDraft()),
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);

  React.useEffect(() => {
    if (!loadedTemplate) {
      return;
    }

    const nextDraft: EditableTemplate = {
      name: loadedTemplate.name,
      description: loadedTemplate.description || "",
      category: loadedTemplate.category,
      sections: loadedTemplate.sections,
      designSettings: loadedTemplate.designSettings,
    };

    setDraft(nextDraft);
    setInitialSnapshot(serializeTemplateDraft(nextDraft));
  }, [loadedTemplate]);

  const snapshot = serializeTemplateDraft(draft);
  const hasUnsavedChanges = snapshot !== initialSnapshot;
  const duplicateName = templates.some(
    (template) =>
      template.id !== templateId &&
      template.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
  );

  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveTemplate = React.useCallback(async () => {
    if (!draft.name.trim()) {
      toast({
        variant: "destructive",
        title: "Mallnamn saknas",
        description: "Mall-namn är obligatoriskt.",
      });
      return false;
    }

    if (duplicateName) {
      toast({
        variant: "destructive",
        title: "Dubblettnamn",
        description: "Mallnamn måste vara unikt.",
      });
      return false;
    }

    setIsSaving(true);

    try {
      const saved = isNewTemplate
        ? await api.createTemplate({
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            category: draft.category,
            sections: draft.sections,
            designSettings: draft.designSettings,
          })
        : await api.updateTemplate(templateId!, {
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            category: draft.category,
            sections: draft.sections,
            designSettings: draft.designSettings,
          });

      const nextDraft: EditableTemplate = {
        name: saved.name,
        description: saved.description || "",
        category: saved.category,
        sections: saved.sections,
        designSettings: saved.designSettings,
      };

      setDraft(nextDraft);
      setInitialSnapshot(serializeTemplateDraft(nextDraft));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["templates"] }),
        queryClient.invalidateQueries({ queryKey: ["template", saved.id] }),
      ]);

      if (isNewTemplate) {
        setLocation(`/templates/${saved.id}`);
      }

      toast({ title: "Mall sparad" });
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte spara mallen",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    draft,
    duplicateName,
    isNewTemplate,
    queryClient,
    setLocation,
    templateId,
    toast,
  ]);

  const handleBack = React.useCallback(async () => {
    if (!hasUnsavedChanges) {
      setLocation("/templates");
      return;
    }

    const ok = await confirm({
      title: "Osparade ändringar",
      description:
        "Du har gjort ändringar i mallen som inte sparats än. Vill du spara dem innan du lämnar sidan?",
      confirmLabel: "Spara och lämna",
      cancelLabel: "Släng ändringar",
    });

    if (!ok) {
      setLocation("/templates");
      return;
    }

    const saved = await saveTemplate();
    if (saved) {
      setLocation("/templates");
    }
  }, [hasUnsavedChanges, saveTemplate, setLocation, confirm]);

  const handleCopyBuiltIn = async () => {
    if (!loadedTemplate) return;

    setIsCopying(true);
    try {
      const copy = await api.copyTemplate(loadedTemplate.id);
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setLocation(`/templates/${copy.id}`);
      toast({ title: "Kopia skapad" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte kopiera mallen",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsCopying(false);
    }
  };

  if (isAuthLoading || (!isNewTemplate && isLoading)) {
    return <DocumentBuilderSkeleton />;
  }

  if (loadedTemplate?.isBuiltIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-lg rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Inbyggd mall
          </p>
          <h1 className="mt-3 text-3xl font-display font-bold text-foreground">
            {loadedTemplate.name}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Inbyggda mallar kan inte redigeras. Spara en kopia först och
            redigera den istället.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => void handleCopyBuiltIn()}
              disabled={isCopying}
            >
              {isCopying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CopyPlus className="mr-2 h-4 w-4" />
              )}
              Kopiera mall
            </Button>
            <Button variant="outline" onClick={() => setLocation("/templates")}>
              Tillbaka till mallar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DocumentBuilder
      mode="template"
      title={draft.name}
      sections={draft.sections}
      designSettings={draft.designSettings}
      onTitleChange={(value) =>
        setDraft((current) => ({ ...current, name: value }))
      }
      onSectionsChange={(sections) =>
        setDraft((current) => ({ ...current, sections }))
      }
      onDesignSettingsChange={(designSettings) =>
        setDraft((current) => ({ ...current, designSettings }))
      }
      onSave={() => void saveTemplate()}
      onBack={() => void handleBack()}
      isSaving={isSaving}
      notice={
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">
            Du redigerar en mall, ingen kundspecifik information ska sparas här.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-2">
                <label htmlFor="template-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/80">
                  Mall-namn
                </label>
                <input
                  id="template-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2"
                  placeholder="Mall-namn"
                />
              {duplicateName && (
                <p className="text-xs text-red-700">
                  Mallnamn måste vara unikt.
                </p>
              )}
            </div>
            <div className="space-y-2">
                <label htmlFor="template-description" className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/80">
                  Beskrivning
                </label>
                <input
                  id="template-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2"
                  placeholder="Kort beskrivning"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="template-category" className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/80">
                  Kategori
                </label>
                <select
                  id="template-category"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value as TemplateCategory,
                    }))
                  }
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2"
                >
                  <option value="webb">Webb</option>
                  <option value="ai-agent">AI-agent</option>
                  <option value="konsult">Konsult</option>
                  <option value="ovrigt">Övrigt</option>
                </select>
            </div>
          </div>
        </div>
      }
    />
  );
}
