import React from "react";
import {
  Building2,
  Calendar,
  Clock,
  Download,
  Eye,
  History,
  Link2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { StatusBadge } from "@/components/status-badge";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { api, type Proposal, type ProposalEvidence } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/document";
import { buildEvidenceReportHtml } from "@/lib/evidence-report";
import { buildPublicProposalUrl } from "@/lib/post-send-summary";
import { useAuth } from "@/components/auth-provider";

function formatPartyAddress(proposalParty: Proposal["parties"]["recipient"]) {
  return [
    proposalParty.address,
    [proposalParty.postalCode, proposalParty.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function detailValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || "Inte angivet";
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
      return "Ingen registrerad aktivitet";
  }
}

function shortenFingerprint(value: string | undefined) {
  if (!value) return "Inte registrerad";
  if (value.length <= 22) return value;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ArchivePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [search, setSearch] = React.useState("");
  const [selectedProposal, setSelectedProposal] =
    React.useState<Proposal | null>(null);
  const selectedProposalId = selectedProposal?.id;

  const {
    data: proposals = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.listProposals,
    enabled: isAuthenticated && !isAuthLoading,
  });
  const {
    data: evidence,
    isLoading: isEvidenceLoading,
  } = useQuery({
    queryKey: ["proposal-evidence", selectedProposalId],
    queryFn: () => api.getProposalEvidence(selectedProposalId!),
    enabled:
      isAuthenticated &&
      !isAuthLoading &&
      selectedProposalId !== undefined,
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
          Kunde inte ladda arkivet
        </h2>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant/70">
          {error instanceof Error ? error.message : "Försök ladda om sidan."}
        </p>
      </div>
    );
  }

  // Filter for archived items (anything that isn't a draft)
  const archivedProposals = React.useMemo(() => {
    let result = proposals.filter((p) => p.status !== "draft");
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((proposal) => {
        const haystack = [
          proposal.title,
          proposal.clientName,
          proposal.clientEmail,
          proposal.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    // Sort by updated date (newest first)
    return result.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [proposals, search]);

  const downloadPdf = (proposal: Proposal) => {
    // Open public view and trigger print
    const url = `${buildPublicProposalUrl(proposal.publicSlug)}?print=true`;
    window.open(url, "_blank");
    toast({
      title: "Förbereder PDF",
      description: "Utskriftsdialogen öppnas i en ny flik.",
    });
  };


  const openPublicProposal = (proposal: Proposal) => {
    window.open(buildPublicProposalUrl(proposal.publicSlug), "_blank");
  };

  const openEvidenceReport = async (
    proposal: Proposal,
    proposalEvidence?: ProposalEvidence,
  ) => {
    const reportWindow = window.open("", "_blank");

    if (reportWindow) {
      reportWindow.document.write(`<!doctype html><title>Laddar bevisrapport…</title><body style="font-family: Inter, system-ui, sans-serif; padding: 24px; color: #334155;">Laddar bevisrapport…</body>`);
      reportWindow.document.close();
    }

    try {
      const payload = proposalEvidence ?? (await api.getProposalEvidence(proposal.id));
      const html = buildEvidenceReportHtml(payload);

      if (reportWindow && !reportWindow.closed) {
        reportWindow.document.open();
        reportWindow.document.write(html);
        reportWindow.document.close();
      } else {
        downloadHtml(
          `offera-evidence-report-${proposal.id}-${proposal.publicSlug}.html`,
          html,
        );
      }

      toast({
        title: "Bevisrapport öppnad",
        description: "Rapporten öppnades i en ny flik och kan sparas som PDF.",
      });
    } catch (error) {
      if (reportWindow && !reportWindow.closed) {
        reportWindow.close();
      }
      toast({
        variant: "destructive",
        title: "Kunde inte öppna bevisrapporten",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    }
  };

  const exportEvidenceJson = async (
    proposal: Proposal,
    proposalEvidence?: ProposalEvidence,
  ) => {
    try {
      const payload = proposalEvidence ?? (await api.getProposalEvidence(proposal.id));
      downloadJson(
        `offera-evidence-${proposal.id}-${proposal.publicSlug}.json`,
        payload,
      );
      toast({
        title: "Teknisk JSON exporterat",
        description: "Bevispaketet laddades ned i maskinläsbart format.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte exportera JSON",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 md:space-y-10">
      <Dialog
        open={Boolean(selectedProposal)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProposal(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border-none bg-surface p-0 shadow-2xl sm:w-[calc(100vw-2rem)] sm:rounded-[2.5rem]">
          {selectedProposal ? (
            <div className="flex flex-col h-full bg-[#F8FAFC] overflow-hidden">
              {/* Premium Glass Header */}
              <div className="relative z-10 border-b border-slate-200/60 bg-white/70 px-5 py-5 backdrop-blur-xl sm:px-8 sm:py-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="p-1.5 rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: "var(--proposal-accent)" }}
                      >
                        <History size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        Arkiverad Offert
                      </p>
                    </div>
                    <h2 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {selectedProposal.title}
                    </h2>
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Totalvärde
                      </p>
                      <p className="text-2xl font-black text-slate-900 tabular-nums">
                        {formatCurrency(selectedProposal.totalValue)}
                      </p>
                    </div>
                    <div className="mx-1 hidden h-10 w-px bg-slate-200 sm:block" />
                    <StatusBadge status={selectedProposal.status} />
                  </div>
                </div>
              </div>

              {/* Main Contents - Two Column Layout */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid min-h-full grid-cols-1 gap-0 lg:grid-cols-12">
                  
                  {/* LEFT COLUMN: Proposal Data (60%) */}
                  <div className="space-y-8 p-5 sm:p-6 lg:col-span-7 lg:space-y-10 lg:p-12">
                    
                    {/* Parties Section */}
                    <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-2">
                          <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">
                            <User size={18} />
                          </div>
                          <h3 className="font-bold tracking-tight">Mottagare</h3>
                        </div>
                        
                        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 text-sm shadow-sm sm:p-6">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Företag / Namn</Label>
                            <p className="font-bold text-slate-900">{detailValue(selectedProposal.parties.recipient.companyName)}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Kontaktperson</Label>
                            <p className="text-slate-600">{detailValue(selectedProposal.parties.recipient.contactName)}</p>
                          </div>
                          <div className="flex items-center gap-3 pt-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400">E-post</Label>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Mail size={12} />
                                <span className="font-medium truncate">{detailValue(selectedProposal.parties.recipient.email || selectedProposal.clientEmail)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Adress</Label>
                            <div className="flex items-start gap-2 text-slate-600">
                              <MapPin size={12} className="mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{detailValue(formatPartyAddress(selectedProposal.parties.recipient))}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-2">
                          <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">
                            <Building2 size={18} />
                          </div>
                          <h3 className="font-bold tracking-tight">Avsändare</h3>
                        </div>
                        
                        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 text-sm shadow-sm sm:p-6">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ditt företag</Label>
                            <p className="font-bold text-slate-900">{detailValue(selectedProposal.parties.sender.companyName)}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Kontaktperson</Label>
                            <p className="text-slate-600">{detailValue(selectedProposal.parties.sender.contactName)}</p>
                          </div>
                          <div className="pt-2">
                             <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100/50">
                               <p className="text-[10px] font-bold text-slate-400 mb-1">Märkt som</p>
                               <p className="text-xs font-medium text-slate-600">Revision: {selectedProposal.revisionId ? `#${selectedProposal.revisionId}` : "Original"}</p>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Security Pass (Audit Proof) */}
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 text-slate-900 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-emerald-500">
                          <ShieldCheck size={18} />
                        </div>
                        <h3 className="font-bold tracking-tight">Säkerhetsbevis</h3>
                      </div>
                      
                      <div className="flex flex-col gap-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:flex-row md:gap-8 lg:p-8">
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Signeringsmetod</p>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-sm font-bold text-slate-900">Digital signatur (Certifierad)</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Dokumentfingeravtryck (SHA-256)</p>
                            <code className="text-[11px] font-mono bg-slate-50 px-2 py-1 rounded text-slate-500 break-all border border-slate-100">
                              {selectedProposal.snapshotHash || "Väntar på slutgiltig hash"}
                            </code>
                          </div>
                        </div>

                        <div className="md:w-px md:h-24 bg-slate-100 self-center hidden md:block" />

                        <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-slate-50/50 p-4 md:min-w-[140px]">
                           {selectedProposal.signatureDataUrl ? (
                             <img src={selectedProposal.signatureDataUrl} alt="Signatur" className="max-h-16 w-auto grayscale" />
                           ) : (
                             <div className="text-center space-y-2">
                               <Lock size={20} className="mx-auto text-slate-300" />
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ej ännu signerad</p>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Activity Timeline (40%) */}
                  <div className="relative border-t border-slate-200/60 bg-white p-5 sm:p-6 lg:col-span-5 lg:border-l lg:border-t-0 lg:p-12">
                    <div className="space-y-6 lg:sticky lg:top-0 lg:space-y-8">
                       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Clock size={16} />
                          </div>
                          <h3 className="font-bold tracking-tight text-slate-900">Händelseförlopp</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                            onClick={() => void openEvidenceReport(selectedProposal, evidence)}
                          >
                            Bevisrapport
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                            onClick={() => void exportEvidenceJson(selectedProposal, evidence)}
                          >
                            JSON
                          </Button>
                        </div>
                      </div>

                      {isEvidenceLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                          <p className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Läser in historik...</p>
                        </div>
                      ) : (
                        <div className="group/timeline relative space-y-8 pl-6 sm:space-y-10">
                          {/* Timeline Line */}
                          <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-slate-100 group-hover/timeline:bg-slate-200 transition-colors" />

                          {(evidence?.auditEvents.length ? evidence.auditEvents : []).map((event, idx) => (
                            <div key={event.id || idx} className="relative">
                              {/* Timeline Dot */}
                              <div 
                                className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ring-2 ring-slate-50 group-hover/timeline:ring-slate-100 transition-all"
                                style={{ backgroundColor: event.eventType === 'proposal_signed' ? '#10b981' : 'var(--proposal-accent)' }}
                              />
                              
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-black text-slate-900">
                                    {formatAuditEventLabel(event.eventType)}
                                  </p>
                                  <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                                    {formatDate(event.createdAt)}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {event.actorEmail && (
                                    <p className="text-[10px] text-slate-500 font-medium">{event.actorEmail}</p>
                                  )}
                                  {event.ipAddress && (
                                    <p className="text-[10px] text-slate-400 font-mono">IP {event.ipAddress}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {!(evidence?.auditEvents.length) && (
                             <div className="text-center py-10">
                               <p className="text-xs text-slate-400 italic">Ingen registrerad historik hittades.</p>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex flex-col-reverse gap-4 border-t border-slate-200/60 bg-white p-5 sm:px-8 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-8">
                <div className="grid gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap">
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-200 px-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hover:border-slate-300 hover:bg-slate-50 sm:px-6"
                    onClick={() => openPublicProposal(selectedProposal)}
                  >
                    <Eye className="mr-2.5 h-4 w-4" />
                    Öppna Webbvy
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-200 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-all active:scale-95 hover:border-slate-300 hover:bg-slate-50 hover:text-emerald-700 sm:px-6"
                    onClick={() => downloadPdf(selectedProposal)}
                  >
                    <Download className="mr-2.5 h-4 w-4" />
                    Ladda ner PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-200 px-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hover:border-slate-300 hover:bg-slate-50 sm:px-6"
                    onClick={() => void openEvidenceReport(selectedProposal, evidence)}
                  >
                    <ShieldCheck className="mr-2.5 h-4 w-4" />
                    Bevisrapport
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                  <Button 
                    variant="ghost" 
                    className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900 sm:px-8"
                    onClick={() => setSelectedProposal(null)}
                  >
                    Stäng
                  </Button>
                  <Button 
                    className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 hover:shadow-xl sm:px-10"
                    style={{ backgroundColor: "var(--proposal-accent)" }}
                    onClick={() => setSelectedProposal(null)}
                  >
                    Slutför granskning
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <header className="animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <History size={20} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
            Arkiv
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-on-surface-variant sm:text-base">
          Här samlas alla dina skickade, visade och signerade offerter. Du kan
          enkelt ladda ner historiska PDF:er och se status på dina affärer.
        </p>
      </header>

      <div className="flex flex-col items-stretch justify-between gap-4 rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-lowest/50 p-4 shadow-sm sm:gap-6 sm:p-6 md:flex-row md:items-center">
        <div className="group relative w-full md:min-w-[400px]">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Sök i arkivet (titel, kund, status)..."
            className="rounded-2xl border-none bg-white py-6 pl-12 shadow-subtle focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm h-12"
          />
        </div>

        <div className="grid grid-cols-2 gap-0 rounded-2xl border border-slate-100 bg-white p-1 shadow-subtle md:flex md:items-center">
          <div className="flex flex-col items-center px-4 py-2.5 sm:px-5">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none mb-1.5">Signerade</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-lg font-black text-slate-900 leading-none tabular-nums">
                {archivedProposals.filter((p) => p.status === "accepted").length}
              </span>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-slate-100 md:block" />
          <div className="flex flex-col items-center px-4 py-2.5 text-center sm:px-5">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none mb-1.5">Totalt</span>
            <span className="text-lg font-black text-slate-900 leading-none tabular-nums">
              {archivedProposals.length} <span className="text-[10px] text-slate-400 font-bold ml-0.5">ST</span>
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
            <p className="text-sm font-medium animate-pulse">
              Hämtar historik...
            </p>
          </div>
        ) : archivedProposals.length === 0 ? (
          <section className="rounded-[2.5rem] border border-dashed border-outline-variant/30 bg-white/50 px-5 py-20 text-center animate-in fade-in zoom-in-95 duration-700 sm:px-6 sm:py-24 md:py-32">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/5 -rotate-6 sm:h-28 sm:w-28">
              <History className="h-14 w-14 text-primary/30" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-on-surface">
              Arkivet är tomt
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-on-surface-variant/80 sm:text-lg">
              Skickade och slutförda offerter kommer att dyka upp här
              automatiskt. Genom att arkivera håller du ditt arbetsbord rent och
              fokuserat.
            </p>
          </section>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="space-y-4 md:hidden">
              {archivedProposals.map((proposal) => (
                <section
                  key={proposal.id}
                  className="rounded-[2rem] border border-outline-variant/10 bg-white p-5 shadow-subtle"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-lg font-black tracking-tight text-on-surface">
                        {proposal.title}
                      </h3>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                        {proposal.clientName || "Namnlös mottagare"}
                      </p>
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-surface-container-low/40 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                        Värde
                      </p>
                      <p className="mt-2 text-base font-black tracking-tight text-on-surface">
                        {formatCurrency(proposal.totalValue)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low/40 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                        Senast uppdaterad
                      </p>
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant/70">
                        {formatDate(proposal.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl border-outline-variant/10 bg-white font-black"
                      onClick={() => setSelectedProposal(proposal)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Detaljer
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl border-outline-variant/10 bg-white font-black"
                      onClick={() => openPublicProposal(proposal)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visa
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      className="h-11 rounded-2xl font-black text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={() => downloadPdf(proposal)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 rounded-2xl font-black text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                      onClick={() => void openEvidenceReport(proposal)}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Rapport
                    </Button>
                  </div>
                </section>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[2.5rem] border border-outline-variant/10 bg-white shadow-subtle md:block">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-outline-variant/5 bg-surface-container-low/30 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                    <th className="px-10 py-6">Offert & mottagare</th>
                    <th className="px-10 py-6 text-center">Status</th>
                    <th className="px-10 py-6">Värde</th>
                    <th className="px-10 py-6">Signerat/Ändrat</th>
                    <th className="px-10 py-6 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {archivedProposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className="group hover:bg-primary/[0.01] transition-colors duration-500"
                    >
                      <td className="px-10 py-7">
                        <div className="font-bold text-on-surface text-base">
                          {proposal.title}
                        </div>
                        <div className="mt-1 text-xs font-medium text-on-surface-variant/70">
                          {proposal.clientName || "Namnlös mottagare"}
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex justify-center">
                          <StatusBadge status={proposal.status} />
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="text-sm font-bold text-on-surface">
                          {formatCurrency(proposal.totalValue)}
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
                          {formatDate(proposal.updatedAt)}
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl font-bold text-xs h-9 hover:bg-primary/5 hover:text-primary"
                            onClick={() => setSelectedProposal(proposal)}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Detaljer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl font-bold text-xs h-9 hover:bg-primary/5 hover:text-primary"
                            onClick={() =>
                              openPublicProposal(proposal)
                            }
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Visa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl font-bold text-xs h-9 hover:bg-emerald-50 hover:text-emerald-600"
                            onClick={() => downloadPdf(proposal)}
                          >
                            <Download className="mr-2 h-3.5 w-3.5" />
                            PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl font-bold text-xs h-9 hover:bg-sky-50 hover:text-sky-700"
                            onClick={() => void openEvidenceReport(proposal)}
                          >
                            <Link2 className="mr-2 h-3.5 w-3.5" />
                            Rapport
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
