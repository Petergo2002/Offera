import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { CheckCircle2, Loader2, Send, SquarePen } from "lucide-react";
import type {
  Proposal,
  ProposalParties,
  TemplateCategory,
} from "@workspace/api-zod";
import { DocumentBuilder, DocumentBuilderSkeleton } from "@/components/document-builder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { savePostSendSummary } from "@/lib/post-send-summary";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/custom-confirm";
import { useAuth } from "@/components/auth-provider";
import {
  calculateDocumentTotal,
  ensurePartiesSection,
  normalizeDesignSettings,
  sectionsContainPlaceholders,
} from "@/lib/document";
import { useCompanySettings } from "@/hooks/use-company-settings";
import type { CompanySettings } from "@/hooks/use-company-settings";

type SaveTemplateState = {
  name: string;
  category: TemplateCategory;
  description: string;
  successTemplateId?: number;
};

function syncRecipientMirror(
  proposal: Proposal,
  updater: (parties: ProposalParties) => ProposalParties,
): Proposal {
  const parties = updater(structuredClone(proposal.parties));

  return {
    ...proposal,
    parties,
    clientName: parties.recipient.companyName,
    clientEmail: parties.recipient.email || undefined,
  };
}

function applyCompanySettingsToProposal(
  proposal: Proposal,
  companySettings: CompanySettings,
): Proposal {
  const nextProposal = structuredClone(proposal);
  const sender = nextProposal.parties.sender;

  if (!sender.companyName && companySettings.companyName) {
    sender.companyName = companySettings.companyName;
  }
  if (!sender.contactName && companySettings.contactName) {
    sender.contactName = companySettings.contactName;
  }
  if (!sender.orgNumber && companySettings.orgNumber) {
    sender.orgNumber = companySettings.orgNumber;
  }
  if (!sender.email && companySettings.email) {
    sender.email = companySettings.email;
  }
  if (!sender.phone && companySettings.phone) {
    sender.phone = companySettings.phone;
  }
  if (!sender.address && companySettings.address) {
    sender.address = companySettings.address;
  }
  if (!sender.postalCode && companySettings.postalCode) {
    sender.postalCode = companySettings.postalCode;
  }
  if (!sender.city && companySettings.city) {
    sender.city = companySettings.city;
  }

  if (!nextProposal.branding.logoUrl && companySettings.logoUrl) {
    nextProposal.branding.logoUrl = companySettings.logoUrl;
  }

  nextProposal.sections = ensurePartiesSection(nextProposal.sections);

  return nextProposal;
}

export default function ProposalBuilderPage() {
  const [, params] = useRoute("/proposal/:id");
  const proposalId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const { data: fetchedProposal, isLoading } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => api.getProposal(proposalId),
    enabled: Number.isFinite(proposalId) && isAuthenticated && !isAuthLoading,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    enabled: isAuthenticated && !isAuthLoading,
  });
  const { settings: companySettings } = useCompanySettings();

  const [proposal, setProposal] = React.useState<Proposal | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [sendModalOpen, setSendModalOpen] = React.useState(false);
  const [sendEmail, setSendEmail] = React.useState("");
  const [sendMessage, setSendMessage] = React.useState("");
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] =
    React.useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = React.useState(false);
  const [templateState, setTemplateState] = React.useState<SaveTemplateState>({
    name: "Ny mall",
    category: "ovrigt",
    description: "",
  });

  React.useEffect(() => {
    if (!fetchedProposal) {
      return;
    }

    if (proposal?.id === fetchedProposal.id) {
      return;
    }

    const mergedProposal = applyCompanySettingsToProposal(
      fetchedProposal,
      companySettings,
    );

    setProposal(mergedProposal);
    setSendEmail(
      mergedProposal.parties.recipient.email ||
        mergedProposal.clientEmail ||
        "",
    );
    setTemplateState({
      name: `${mergedProposal.title} Mall`,
      category: "ovrigt",
      description: "",
    });
  }, [companySettings, fetchedProposal, proposal?.id]);

  React.useEffect(() => {
    setProposal((current) => {
      if (!current) {
        return current;
      }

      const nextProposal = applyCompanySettingsToProposal(
        current,
        companySettings,
      );

      return JSON.stringify(nextProposal) === JSON.stringify(current)
        ? current
        : nextProposal;
    });
  }, [companySettings]);

  if (isAuthLoading || isLoading || !proposal) {
    return <DocumentBuilderSkeleton />;
  }

  const duplicateTemplateName = templates.some(
    (template) =>
      template.name.trim().toLowerCase() ===
      templateState.name.trim().toLowerCase(),
  );
  const hasPlaceholders = sectionsContainPlaceholders(proposal.sections);

  const saveProposal = async () => {
    setIsSaving(true);
    try {
      const updated = await api.updateProposal(proposal.id, {
        title: proposal.title,
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        sections: proposal.sections,
        branding: proposal.branding,
        parties: proposal.parties,
        totalValue: calculateDocumentTotal(proposal.sections),
      });

      setProposal(updated);
      await queryClient.invalidateQueries({
        queryKey: ["proposal", proposal.id],
      });
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Offerten sparad" });
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte spara",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const sendProposal = async () => {
    setIsSending(true);
    try {
      const nextProposal = syncRecipientMirror(proposal, (parties) => ({
        ...parties,
        recipient: {
          ...parties.recipient,
          email: sendEmail,
        },
      }));

      await api.updateProposal(proposal.id, {
        title: nextProposal.title,
        clientName: nextProposal.clientName,
        clientEmail: nextProposal.clientEmail,
        sections: nextProposal.sections,
        branding: nextProposal.branding,
        parties: nextProposal.parties,
        totalValue: calculateDocumentTotal(nextProposal.sections),
      });

      const updated = await api.sendProposal(proposal.id, {
        clientEmail: sendEmail,
        personalMessage: sendMessage || undefined,
      });

      savePostSendSummary({
        proposalId: updated.id,
        title: updated.title,
        clientName: updated.clientName || undefined,
        clientEmail: updated.clientEmail || undefined,
        publicSlug: updated.publicSlug,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      });
      setProposal(updated);
      setSendModalOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["proposal", proposal.id] }),
        queryClient.invalidateQueries({ queryKey: ["proposals"] }),
      ]);
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte skicka offerten",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!templateState.name.trim()) {
      toast({
        variant: "destructive",
        title: "Mallnamn saknas",
      });
      return;
    }

    if (duplicateTemplateName) {
      toast({
        variant: "destructive",
        title: "Mallnamn måste vara unikt",
      });
      return;
    }

    setIsSavingTemplate(true);
    try {
      const template = await api.createTemplate({
        name: templateState.name.trim(),
        category: templateState.category,
        description: templateState.description.trim() || undefined,
        sourceProposalId: proposal.id,
      });

      setTemplateState((current) => ({
        ...current,
        successTemplateId: template.id,
      }));
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte spara som mall",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };



  return (
    <>
      <DocumentBuilder
        mode="proposal"
        title={proposal.title}
        status={proposal.status}
        sections={proposal.sections}
        designSettings={normalizeDesignSettings(proposal.branding)}
        onTitleChange={(value) =>
          setProposal((current) =>
            current ? { ...current, title: value } : current,
          )
        }
        onSectionsChange={(sections) =>
          setProposal((current) =>
            current ? { ...current, sections } : current,
          )
        }
        onDesignSettingsChange={(branding) =>
          setProposal((current) =>
            current ? { ...current, branding } : current,
          )
        }
        onSave={() => void saveProposal()}
        onBack={async () => {
          const isDirty =
            JSON.stringify(proposal) !== JSON.stringify(fetchedProposal);
          if (isDirty) {
            const ok = await confirm({
              title: "Osparade ändringar",
              description:
                "Du har gjort ändringar i offerten som inte sparats än. Vill du spara dem innan du stänger?",
              confirmLabel: "Spara och stäng",
              cancelLabel: "Stäng utan att spara",
            });
            if (!ok) {
              setLocation("/");
              return;
            }
            const saved = await saveProposal();
            if (saved !== false) {
              setLocation("/");
            }
          } else {
            setLocation("/");
          }
        }}
        isSaving={isSaving}
        clientName={proposal.clientName}
        parties={proposal.parties}
        onPartiesChange={(parties) =>
          setProposal((current) =>
            current
              ? {
                  ...current,
                  parties,
                  clientName: parties.recipient.companyName,
                  clientEmail: parties.recipient.email || undefined,
                }
              : current,
          )
        }
        attentionPrompt={null}
        secondaryAction={{
          label: "Spara som mall",
          icon: <SquarePen className="mr-2 h-4 w-4" />,
          onClick: () => setSaveTemplateModalOpen(true),
        }}
        primaryAction={{
          label: "Skicka offert",
          icon: <Send className="mr-2 h-4 w-4" />,
          onClick: () => {
            setSendEmail(
              proposal.parties.recipient.email || proposal.clientEmail || "",
            );
            setSendMessage(proposal.personalMessage || "");
            setSendModalOpen(true);
          },
        }}
        createdAt={proposal.createdAt}
      />

      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Skicka offert till kund</DialogTitle>
            <DialogDescription>
              En unik länk skickas till kunden. Kontrollera e-post och
              meddelande innan du skickar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mottagare</Label>
              <Input
                value={proposal.parties.recipient.companyName}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Kundens e-post</Label>
              <Input
                value={sendEmail}
                onChange={(event) => setSendEmail(event.target.value)}
                placeholder="kund@foretag.se"
              />
            </div>
            <div className="space-y-2">
              <Label>Personligt meddelande</Label>
              <Textarea
                value={sendMessage}
                onChange={(event) => setSendMessage(event.target.value)}
                placeholder="Hej, här kommer offerten vi pratade om..."
                className="min-h-[140px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={() => void sendProposal()}
              disabled={isSending || !sendEmail.trim()}
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Skicka länk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={saveTemplateModalOpen}
        onOpenChange={(open) => {
          setSaveTemplateModalOpen(open);
          if (!open) {
            setTemplateState((current) => ({
              ...current,
              successTemplateId: undefined,
            }));
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          {templateState.successTemplateId ? (
            <>
              <DialogHeader>
                <DialogTitle>Mall sparad!</DialogTitle>
                <DialogDescription>Vill du redigera den nu?</DialogDescription>
              </DialogHeader>
              <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
                Kundspecifik information, parter och priser har rensats från
                mallen.
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveTemplateModalOpen(false)}
                >
                  Stäng
                </Button>
                <Button
                  onClick={() => {
                    setSaveTemplateModalOpen(false);
                    setLocation(
                      `/templates/${templateState.successTemplateId}`,
                    );
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Redigera mallen
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Spara som mall</DialogTitle>
                <DialogDescription>
                  Kundspecifik information (namn, e-post, priser) kommer inte
                  sparas i mallen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  Kundspecifik information (parter, namn, e-post, priser) kommer
                  inte sparas i mallen.
                </div>
                <div className="space-y-2">
                  <Label>Mall-namn</Label>
                  <Input
                    value={templateState.name}
                    onChange={(event) =>
                      setTemplateState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Mall-namn"
                  />
                  {duplicateTemplateName ? (
                    <p className="text-xs text-red-700">
                      Mallnamn måste vara unikt.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <select
                    value={templateState.category}
                    onChange={(event) =>
                      setTemplateState((current) => ({
                        ...current,
                        category: event.target.value as TemplateCategory,
                      }))
                    }
                    className="w-full rounded-xl border border-input bg-background px-3 py-2"
                  >
                    <option value="webb">Webb</option>
                    <option value="ai-agent">AI-agent</option>
                    <option value="konsult">Konsult</option>
                    <option value="ovrigt">Övrigt</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Beskrivning</Label>
                  <Textarea
                    value={templateState.description}
                    onChange={(event) =>
                      setTemplateState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Kort beskrivning av när mallen ska användas"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveTemplateModalOpen(false)}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={() => void saveAsTemplate()}
                  disabled={isSavingTemplate || duplicateTemplateName}
                >
                  {isSavingTemplate ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Spara mall
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
