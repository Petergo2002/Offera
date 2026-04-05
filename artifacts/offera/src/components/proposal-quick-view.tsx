import React from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  MoreVertical,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

import { api, type Proposal, type ProposalEvidence } from "@/lib/api";
import { buildEvidenceReportHtml } from "@/lib/evidence-report";
import {
  calculateDocumentTotal,
  formatCurrency,
  formatDate,
} from "@/lib/document";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/custom-confirm";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProposalQuickViewProps {
  proposalId: number | null;
  onClose: () => void;
}

type QuickViewMode = "overview" | "evidence";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Inte registrerad";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Inte registrerad";
  return format(date, "d MMMM yyyy, HH:mm", { locale: sv });
}

function formatAuditEventLabel(value: string | undefined) {
  switch (value) {
    case "proposal_created":
      return "Offert skapad";
    case "proposal_updated":
      return "Offert uppdaterad";
    case "proposal_sent":
      return "Offert skickad";
    case "proposal_viewed":
      return "Offert öppnad";
    case "signing_link_opened":
      return "Personlig länk öppnad";
    case "proposal_signed":
      return "Offert signerad";
    case "proposal_declined":
      return "Offert avböjd";
    case "new_revision_created":
      return "Ny revision skapad";
    case "confirmation_sent":
      return "Bekräftelse skickad";
    case "tamper_detected":
      return "Manipulation upptäckt";
    default:
      return value || "Registrerad aktivitet";
  }
}

function getEventAccent(value: string | undefined) {
  switch (value) {
    case "proposal_signed":
    case "confirmation_sent":
      return {
        dot: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]",
        text: "text-emerald-700",
      };
    case "proposal_declined":
    case "tamper_detected":
      return {
        dot: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
        text: "text-red-700",
      };
    case "proposal_sent":
    case "proposal_viewed":
    case "signing_link_opened":
      return {
        dot: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
        text: "text-orange-700",
      };
    default:
      return {
        dot: "bg-primary",
        text: "text-on-surface",
      };
  }
}

function getSignerSummary(evidence: ProposalEvidence | null | undefined) {
  const revision = evidence?.activeRevision;
  const acceptanceEvidence = revision?.acceptanceEvidence;

  return {
    signerName:
      revision?.signerName ||
      acceptanceEvidence?.signerName ||
      evidence?.proposal.clientName ||
      "Inte registrerat",
    signerEmail:
      revision?.signerEmail ||
      acceptanceEvidence?.signerEmail ||
      revision?.signingRecipientEmail ||
      evidence?.proposal.clientEmail ||
      "Inte registrerat",
    signedAt:
      revision?.signedAt ||
      revision?.declinedAt ||
      revision?.viewedAt ||
      revision?.sentAt,
    ipAddress: acceptanceEvidence?.ipAddress || "Inte registrerad",
    userAgent: acceptanceEvidence?.userAgent || "Inte registrerad",
    signatureDataUrl:
      revision?.signatureDataUrl || acceptanceEvidence?.signatureDataUrl,
  };
}

function openEvidenceReport(evidence: ProposalEvidence) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    return false;
  }

  reportWindow.document.write(buildEvidenceReportHtml(evidence));
  reportWindow.document.close();
  return true;
}

export function ProposalQuickView({
  proposalId,
  onClose,
}: ProposalQuickViewProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [mode, setMode] = React.useState<QuickViewMode>("overview");
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const { data: proposal, isLoading: isProposalLoading } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => (proposalId ? api.getProposal(proposalId) : null),
    enabled: !!proposalId,
  });

  const { data: evidence, isLoading: isEvidenceLoading } = useQuery({
    queryKey: ["proposal", proposalId, "evidence"],
    queryFn: () => (proposalId ? api.getProposalEvidence(proposalId) : null),
    enabled: !!proposalId,
  });

  React.useEffect(() => {
    setMode("overview");
  }, [proposalId]);

  const isLoading = isProposalLoading || isEvidenceLoading;
  const isOpen = !!proposalId;
  const signerSummary = getSignerSummary(evidence);

  const duplicateProposal = async (currentProposal: Proposal) => {
    setIsDuplicating(true);

    try {
      const created = await api.createProposal({
        title: currentProposal.title.startsWith("Kopia av ")
          ? currentProposal.title
          : `Kopia av ${currentProposal.title}`,
        clientName: currentProposal.clientName,
        clientEmail: currentProposal.clientEmail,
      });

      const duplicated = await api.updateProposal(created.id, {
        title: created.title,
        clientName: currentProposal.clientName,
        clientEmail: currentProposal.clientEmail,
        sections: structuredClone(currentProposal.sections),
        branding: structuredClone(currentProposal.branding),
        parties: structuredClone(currentProposal.parties),
        totalValue: calculateDocumentTotal(currentProposal.sections),
      });

      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Kopia skapad",
        description: "Du kan nu arbeta vidare i en ny inmatningsvy.",
      });
      onClose();
      setLocation(`/proposal/${duplicated.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte skapa kopia",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const deleteProposal = async (currentProposal: Proposal) => {
    const ok = await confirm({
      title: "Ta bort offerten permanent?",
      description:
        "Offerten, historiken och tillhörande bevisdata tas bort permanent och kan inte återställas.",
      confirmLabel: "Ta bort permanent",
      cancelLabel: "Behåll offerten",
      variant: "destructive",
    });

    if (!ok) return;

    setIsDeleting(true);

    try {
      await api.deleteProposal(currentProposal.id);
      queryClient.setQueryData<Proposal[]>(["proposals"], (current = []) =>
        current.filter((proposal) => proposal.id !== currentProposal.id),
      );
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Offert borttagen",
        description: "Offerten togs bort permanent.",
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte ta bort offerten",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setMode("overview");
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-outline-variant/10 p-0 sm:max-w-xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {proposal
              ? `Offertöversikt för ${proposal.title}`
              : "Offertöversikt"}
          </SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="flex h-full flex-col bg-surface-container-lowest p-8">
            <Skeleton className="mb-4 h-8 w-48" />
            <Skeleton className="mb-8 h-4 w-32" />
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
          </div>
        ) : proposal ? (
          <>
            <ScrollArea className="flex-1">
              <div className="flex flex-col bg-surface-container-lowest p-8">
                <header className="mb-8 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="mb-1 flex items-center gap-2">
                        <StatusBadge status={proposal.status} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                          Ref: #{proposal.id}
                        </span>
                      </div>

                      {mode === "evidence" ? (
                        <>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                            Bevis
                          </p>
                          <h2 className="text-2xl font-black tracking-tight text-on-surface leading-tight">
                            Signeringsbevis
                          </h2>
                          <p className="text-sm font-bold text-on-surface-variant/60">
                            All intern spårbarhet för den här offerten.
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-black tracking-tight text-on-surface leading-tight">
                            {proposal.title}
                          </h2>
                          <p className="text-sm font-bold text-on-surface-variant/60">
                            {proposal.clientName || "Namnlös kund"}
                          </p>
                        </>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-2xl transition-all hover:bg-surface-container-low"
                        >
                          <MoreVertical size={20} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-2xl border-outline-variant/10 p-2 shadow-elevated"
                      >
                        <DropdownMenuItem
                          className="rounded-xl px-3 py-3 font-bold"
                          onClick={() => duplicateProposal(proposal)}
                          disabled={isDuplicating}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {isDuplicating ? "Skapar kopia..." : "Kopiera offert"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl px-3 py-3 font-bold"
                          onClick={() =>
                            setMode((current) =>
                              current === "overview" ? "evidence" : "overview",
                            )
                          }
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {mode === "overview" ? "Bevis" : "Översikt"}
                        </DropdownMenuItem>
                        <Separator className="my-2" />
                        <DropdownMenuItem
                          className="rounded-xl px-3 py-3 font-bold text-error focus:text-error"
                          onClick={() => deleteProposal(proposal)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting ? "Tar bort..." : "Radera permanent"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>

                {mode === "evidence" ? (
                  <div className="space-y-6">
                    <Button
                      variant="ghost"
                      className="h-11 w-fit rounded-2xl px-4 font-black text-on-surface-variant hover:bg-white"
                      onClick={() => setMode("overview")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Till översikt
                    </Button>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-outline-variant/5 bg-white p-5 shadow-subtle">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-primary/5 p-2 text-primary">
                            <ShieldCheck size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
                            Signeringsstatus
                          </span>
                        </div>
                        <p className="text-base font-black tracking-tight text-on-surface">
                          {proposal.status === "accepted"
                            ? "Signerad och låst"
                            : proposal.status === "declined"
                              ? "Avböjd"
                              : "Ej slutförd"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant/70">
                          Senaste verifierade händelse:{" "}
                          {formatDateTime(signerSummary.signedAt)}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-outline-variant/5 bg-white p-5 shadow-subtle">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-primary/5 p-2 text-primary">
                            <User size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
                            Signerare
                          </span>
                        </div>
                        <p className="text-base font-black tracking-tight text-on-surface">
                          {signerSummary.signerName}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant/70">
                          {signerSummary.signerEmail}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-outline-variant/5 bg-white p-5 shadow-subtle sm:col-span-2">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-primary/5 p-2 text-primary">
                            <FileText size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
                            Dokumentfingeravtryck
                          </span>
                        </div>
                        <p className="break-all text-sm font-black tracking-[0.08em] text-on-surface">
                          {evidence?.activeRevision?.snapshotHash || "Inte registrerat"}
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-surface-container-low/40 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                              Revision
                            </p>
                            <p className="mt-2 text-sm font-black text-on-surface">
                              {evidence?.activeRevision
                                ? `#${evidence.activeRevision.revisionNumber}`
                                : "Ej skapad"}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface-container-low/40 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                              IP-adress
                            </p>
                            <p className="mt-2 text-sm font-black text-on-surface">
                              {signerSummary.ipAddress}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface-container-low/40 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                              Personlig länk
                            </p>
                            <p className="mt-2 text-sm font-black text-on-surface">
                              {evidence?.signingTokens.length
                                ? `${evidence.signingTokens.length} registrerade`
                                : "Ingen tokenhistorik"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {signerSummary.signatureDataUrl ? (
                      <section className="rounded-[2rem] border border-outline-variant/10 bg-white p-5 shadow-subtle">
                        <div className="mb-4 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface/80">
                            Kundens signatur
                          </h3>
                        </div>
                        <div className="rounded-[1.5rem] border border-dashed border-outline-variant/20 bg-surface-container-low/30 p-4">
                          <img
                            src={signerSummary.signatureDataUrl}
                            alt="Signerad signatur"
                            className="max-h-40 w-full rounded-2xl bg-white object-contain p-4"
                          />
                        </div>
                      </section>
                    ) : null}

                    <section className="rounded-[2rem] border border-outline-variant/10 bg-white p-5 shadow-subtle">
                      <div className="mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface/80">
                          Audit trail
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {evidence?.auditEvents.length ? (
                          evidence.auditEvents.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-2xl border border-outline-variant/8 bg-surface-container-lowest px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-on-surface">
                                    {formatAuditEventLabel(event.eventType)}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-on-surface-variant/70">
                                    {formatDateTime(event.createdAt)}
                                    {event.actorEmail
                                      ? ` • ${event.actorEmail}`
                                      : ""}
                                  </p>
                                </div>
                                {event.ipAddress ? (
                                  <span className="rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                                    {event.ipAddress}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-outline-variant/20 px-4 py-6 text-sm text-on-surface-variant/70">
                            Ingen audit trail registrerad ännu.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                ) : (
                  <>
                    <div className="mb-8 grid grid-cols-2 gap-4">
                      <div className="rounded-3xl border border-outline-variant/5 bg-white p-5 shadow-subtle transition-all hover:shadow-soft">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-primary/5 p-2 text-primary">
                            <TrendingUp size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
                            Värde
                          </span>
                        </div>
                        <p className="text-xl font-black tracking-tight text-on-surface">
                          {formatCurrency(proposal.totalValue)}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-outline-variant/5 bg-white p-5 shadow-subtle transition-all hover:shadow-soft">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-primary/5 p-2 text-primary">
                            <Clock size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
                            Senast ändrad
                          </span>
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant/80">
                          {formatDate(proposal.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-on-surface/80">
                          <Activity size={14} className="text-primary" />
                          Händelseförlopp
                        </h3>
                        {evidence?.activeRevision ? (
                          <button
                            type="button"
                            className="text-[11px] font-black uppercase tracking-[0.16em] text-primary transition-opacity hover:opacity-75"
                            onClick={() => setMode("evidence")}
                          >
                            Visa bevis
                          </button>
                        ) : null}
                      </div>

                      <div className="relative space-y-8 pl-4">
                        <div className="absolute bottom-2 left-[23px] top-2 w-0.5 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

                        {evidence?.auditEvents?.length ? (
                          evidence.auditEvents.map((event, idx) => {
                            const accent = getEventAccent(event.eventType);

                            return (
                              <div
                                key={event.id}
                                className="relative flex gap-4 animate-in slide-in-from-left-2 fade-in duration-500 fill-mode-both"
                                style={{ animationDelay: `${idx * 50}ms` }}
                              >
                                <div
                                  className={cn(
                                    "relative z-10 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface-container-lowest transition-transform duration-300 hover:scale-110",
                                    accent.dot,
                                  )}
                                >
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                </div>
                                <div className="flex-1 -mt-0.5">
                                  <p
                                    className={cn(
                                      "text-sm font-black leading-tight transition-colors",
                                      accent.text,
                                    )}
                                  >
                                    {formatAuditEventLabel(event.eventType)}
                                  </p>
                                  <p className="mt-1 text-[10px] font-medium text-on-surface-variant/60">
                                    {formatDateTime(event.createdAt)}
                                    {event.actorEmail ? ` • ${event.actorEmail}` : ""}
                                    {event.ipAddress ? ` • ${event.ipAddress}` : ""}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center gap-3 py-4 text-xs italic text-on-surface-variant/40">
                            <Clock size={14} />
                            Ingen historik tillgänglig än
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-outline-variant/10 bg-white p-8">
              <div className="flex w-full flex-col gap-3">
                {mode === "evidence" ? (
                  <>
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-2xl border-outline-variant/15 bg-white font-black"
                      onClick={() => {
                        if (!evidence) return;
                        const opened = openEvidenceReport(evidence);
                        if (!opened) {
                          toast({
                            variant: "destructive",
                            title: "Kunde inte öppna bevisrapporten",
                            description:
                              "Tillåt popup-fönster och försök igen.",
                          });
                        }
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Öppna bevisrapport
                    </Button>
                    <Button
                      className="h-14 w-full rounded-2xl bg-primary-gradient text-lg font-black shadow-elevated transition-all hover:shadow-soft active:scale-95"
                      onClick={() => {
                        onClose();
                        setLocation(`/proposal/${proposal.id}`);
                      }}
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Öppna i Redigeraren
                    </Button>
                  </>
                ) : (
                  <Button
                    className="h-14 w-full rounded-2xl bg-primary-gradient text-lg font-black shadow-elevated transition-all hover:shadow-soft active:scale-95"
                    onClick={() => {
                      onClose();
                      setLocation(`/proposal/${proposal.id}`);
                    }}
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Öppna i Redigeraren
                  </Button>
                )}
              </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-container-lowest p-8">
            <p className="text-sm font-bold text-on-surface-variant">
              Kunde inte hitta offerten.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
