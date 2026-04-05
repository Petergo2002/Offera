import React from "react";
import {
  Building2,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Link2,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/custom-confirm";
import { api, type Proposal } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/document";
import { buildPublicProposalUrl } from "@/lib/post-send-summary";
import { useAuth } from "@/components/auth-provider";
import { ProposalQuickView } from "@/components/proposal-quick-view";
import { cn } from "@/lib/utils";

export default function ArchivePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [search, setSearch] = React.useState("");
  const [selectedProposalId, setSelectedProposalId] = React.useState<number | null>(null);
  const [deletingProposalId, setDeletingProposalId] = React.useState<number | null>(null);

  const {
    data: proposals = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.listProposals,
    enabled: isAuthenticated && !isAuthLoading,
  });

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

    return result.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [proposals, search]);

  const downloadPdf = (proposal: Proposal) => {
    const url = `${buildPublicProposalUrl(proposal.publicSlug)}?print=true`;
    window.open(url, "_blank");
    toast({
      title: "Förbereder PDF",
      description: "Utskriftsdialogen öppnas i en ny flik.",
    });
  };

  const deleteProposal = async (proposal: Proposal) => {
    if (deletingProposalId === proposal.id) {
      return;
    }

    const ok = await confirm({
      title: "Ta bort offerten permanent?",
      description:
        "Offerten tas bort från arkivet och kan inte återställas. Säkerställ att du inte längre behöver historiken innan du fortsätter.",
      confirmLabel: "Ta bort permanent",
      cancelLabel: "Behåll offerten",
      variant: "destructive",
    });

    if (!ok) return;

    try {
      setDeletingProposalId(proposal.id);
      await api.deleteProposal(proposal.id);
      queryClient.setQueryData<Proposal[]>(["proposals"], (current = []) =>
        current.filter((entry) => entry.id !== proposal.id),
      );
      if (selectedProposalId === proposal.id) {
        setSelectedProposalId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Offert borttagen",
        description: "Offerten togs bort från arkivet.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunde inte ta bort offerten",
        description: err instanceof Error ? err.message : "Försök igen.",
      });
    } finally {
      setDeletingProposalId(null);
    }
  };

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

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 md:space-y-10">
      <ProposalQuickView 
        proposalId={selectedProposalId} 
        onClose={() => setSelectedProposalId(null)} 
      />

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
                  className={cn(
                    "rounded-[2rem] border border-outline-variant/10 bg-white p-5 shadow-subtle transition-all",
                    deletingProposalId === proposal.id &&
                      "pointer-events-none opacity-55 saturate-0",
                  )}
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
                        Uppdaterad
                      </p>
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant/70">
                        {formatDate(proposal.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-2xl border-none bg-surface-container-low font-black hover:bg-primary/5 hover:text-primary transition-all"
                      onClick={() => setSelectedProposalId(proposal.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Detaljer
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      className="h-11 rounded-2xl font-black text-emerald-600 hover:bg-emerald-50"
                      onClick={() => downloadPdf(proposal)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 rounded-2xl font-black text-red-600 hover:bg-red-50"
                      onClick={() => deleteProposal(proposal)}
                      disabled={deletingProposalId === proposal.id}
                    >
                      {deletingProposalId === proposal.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      {deletingProposalId === proposal.id ? "Tar bort..." : "Ta bort"}
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
                      <th className="px-10 py-6">Uppdaterad</th>
                      <th className="px-10 py-6 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {archivedProposals.map((proposal) => (
                      <motion.tr
                        key={proposal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
                        className={cn(
                          "group transition-all duration-500 cursor-pointer",
                          deletingProposalId === proposal.id &&
                            "pointer-events-none opacity-55 saturate-0",
                        )}
                        onClick={() => setSelectedProposalId(proposal.id)}
                      >
                        <td className="px-10 py-7">
                          <div className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">
                            {proposal.title}
                          </div>
                          <div className="mt-1 text-xs font-medium text-on-surface-variant/70">
                            {proposal.clientName || "Namnlös mottagare"}
                          </div>
                        </td>
                        <td className="px-10 py-7">
                          <div className="flex justify-center transition-all duration-500 group-hover:scale-105">
                            <StatusBadge status={proposal.status} />
                          </div>
                        </td>
                        <td className="px-10 py-7">
                          <div className="text-sm font-bold text-on-surface">
                            {formatCurrency(proposal.totalValue)}
                          </div>
                        </td>
                        <td className="px-10 py-7">
                          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                            {formatDate(proposal.updatedAt)}
                          </div>
                        </td>
                        <td className="px-10 py-7 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              className="rounded-xl h-10 px-4 font-black border-none bg-surface-container-low hover:bg-primary/5 hover:text-primary transition-all shadow-subtle"
                              onClick={() => setSelectedProposalId(proposal.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Detaljer
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl h-10 w-10 text-red-500 hover:bg-red-50 transition-all"
                              onClick={() => deleteProposal(proposal)}
                              disabled={deletingProposalId === proposal.id}
                            >
                              {deletingProposalId === proposal.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Trash2 className="h-5 w-5" />
                              )}
                            </Button>
                          </div>

                        </td>
                      </motion.tr>
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
