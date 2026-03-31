import React from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Layout,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  PieChart,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/custom-confirm";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  buildPublicProposalUrl,
  consumePostSendSummary,
  type PostSendSummaryPayload,
} from "@/lib/post-send-summary";
import { formatCurrency, formatDate, TEMPLATE_CATEGORY_LABELS } from "@/lib/document";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 md:hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-[2rem] border border-outline-variant/10 bg-white p-5 shadow-subtle"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-5 w-2/3" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[2rem] border border-outline-variant/10 bg-white shadow-subtle md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant/5 bg-surface-container-low/30 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                <th className="px-10 py-6">Offert & kund</th>
                <th className="px-10 py-6 text-center">Status</th>
                <th className="px-10 py-6">Värde</th>
                <th className="px-10 py-6">Senast ändrad</th>
                <th className="px-10 py-6 text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-outline-variant/5">
                  <td className="px-10 py-7">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <Skeleton className="h-5 w-24" />
                  </td>
                  <td className="px-10 py-7">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-10 py-7 text-right">
                    <Skeleton className="h-10 w-10 rounded-xl ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [postSendSummary, setPostSendSummary] =
    React.useState<PostSendSummaryPayload | null>(null);
  const [postSendDialogOpen, setPostSendDialogOpen] = React.useState(false);

  const {
    data: proposals = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.listProposals,
    enabled: isAuthenticated && !isAuthLoading,
  });

  React.useEffect(() => {
    const summary = consumePostSendSummary();
    if (!summary) {
      return;
    }

    setPostSendSummary(summary);
    setPostSendDialogOpen(true);
  }, []);

  const { filteredProposals, stats } = React.useMemo(() => {
    let result = proposals;
    const query = search.trim().toLowerCase();

    // Stats calculation
    const totalCount = proposals.length;
    const acceptedCount = proposals.filter((p) => p.status === "accepted").length;
    const conversionRate = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;
    const totalValue = proposals
      .filter((proposal) => proposal.status === "accepted")
      .reduce((sum, proposal) => sum + proposal.totalValue, 0);

    // Status filtering
    if (statusFilter !== "all") {
      if (statusFilter === "awaiting") {
        result = result.filter(
          (p) => p.status === "sent" || p.status === "viewed",
        );
      } else if (statusFilter === "signed") {
        result = result.filter((p) => p.status === "accepted");
      } else if (statusFilter === "rejected") {
        result = result.filter((p) => p.status === "declined");
      } else {
        result = result.filter((p) => p.status === statusFilter);
      }
    }

    // Search filtering
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

    return { 
      filteredProposals: result,
      stats: { totalCount, acceptedCount, conversionRate, totalValue }
    };
  }, [proposals, search, statusFilter]);

  const deleteProposal = async (proposalId: number) => {
    const ok = await confirm({
      title: "Radera offert permanent?",
      description:
        "Denna handling går inte att ångra. Offerten kommer tas bort från ditt arbetsbord och arkivet.",
      confirmLabel: "Radera permanent",
      variant: "destructive",
    });

    if (!ok) return;

    try {
      await api.deleteProposal(proposalId);
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Offert raderad" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte radera offerten",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    }
  };

  const publicProposalUrl = postSendSummary
    ? buildPublicProposalUrl(postSendSummary.publicSlug)
    : "";

  const copyPublicLink = async () => {
    if (!publicProposalUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicProposalUrl);
      toast({ title: "Offertlänk kopierad" });
    } catch {
      toast({
        variant: "destructive",
        title: "Kunde inte kopiera länken",
        description: "Försök igen.",
      });
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
          Kunde inte ladda dina offerter
        </h2>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant/70">
          {error instanceof Error ? error.message : "Försök ladda om sidan."}
        </p>
      </div>
    );
  }

  return (
    <>
      <Dialog
        open={postSendDialogOpen}
        onOpenChange={(open) => {
          setPostSendDialogOpen(open);
          if (!open) {
            setPostSendSummary(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Offert skickad</DialogTitle>
            <DialogDescription>
              Din offert är nu skickad med en personlig signeringslänk till
              mottagaren.
            </DialogDescription>
          </DialogHeader>

          {postSendSummary ? (
            <div className="space-y-5 py-2">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
                Offerten har skickats och väntar nu på att mottagaren granskar
                och signerar den digitalt.
              </div>

              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-on-surface">
                      {postSendSummary.title}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {postSendSummary.clientName || "Namnlös mottagare"}
                    </p>
                  </div>
                  <StatusBadge status={postSendSummary.status} />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/60">
                      E-post
                    </p>
                    <p className="text-sm text-on-surface">
                      {postSendSummary.clientEmail || "Ingen e-post angiven"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/60">
                      Skickad
                    </p>
                    <p className="text-sm text-on-surface">
                      {formatDate(postSendSummary.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void copyPublicLink()}>
                Kopiera länk
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!publicProposalUrl) {
                    return;
                  }

                  window.open(publicProposalUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Öppna offentlig offert
              </Button>
            </div>
            <Button onClick={() => setPostSendDialogOpen(false)}>
              Fortsätt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-6xl space-y-8 md:space-y-10">
        <header className="mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-3">
            <span className="h-1 w-8 bg-primary rounded-full" />
            Överblick
          </h2>
          <h1 className="mb-2 text-3xl font-black tracking-tighter text-on-surface sm:text-4xl md:text-5xl">
            Välkommen tillbaka
          </h1>
          <p className="max-w-2xl text-base font-medium text-on-surface-variant sm:text-lg">
            Du har{" "}
            <span className="text-primary font-bold">
              {stats.totalCount} offerter
            </span>{" "}
            i ditt arbetsområde just nu.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          <section
            onClick={() => setStatusFilter("all")}
            className={cn(
              "group cursor-pointer rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-subtle transition-all duration-500 hover:-translate-y-1 hover:shadow-elevated animate-in fade-in slide-in-from-bottom-4 delay-75 fill-mode-both sm:p-6",
              statusFilter === "all" &&
                "ring-2 ring-primary ring-offset-4 border-primary/20",
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform duration-500">
                <FileText size={24} />
              </div>
              <span className="text-[10px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Aktiva
              </span>
            </div>
            <p className="text-on-surface-variant text-sm font-bold mb-1 opacity-60">
              Totala offerter
            </p>
            <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {stats.totalCount}
            </p>
          </section>

          <section
            onClick={() => setStatusFilter("signed")}
            className={cn(
              "group cursor-pointer rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-subtle transition-all duration-500 hover:-translate-y-1 hover:shadow-elevated animate-in fade-in slide-in-from-bottom-4 delay-150 fill-mode-both sm:p-6",
              statusFilter === "signed" &&
                "ring-2 ring-primary ring-offset-4 border-primary/20",
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                <CheckCircle2 size={24} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Vinst
              </span>
            </div>
            <p className="text-on-surface-variant text-sm font-bold mb-1 opacity-60">
              Accepterat värde
            </p>
            <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {formatCurrency(stats.totalValue)}
            </p>
          </section>

          <section
            className={cn(
              "group cursor-default rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-subtle transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-300 fill-mode-both sm:p-6",
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                <PieChart size={24} />
              </div>
              <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Insikt
              </span>
            </div>
            <p className="text-on-surface-variant text-sm font-bold mb-1 opacity-60">
              Konverteringsgrad
            </p>
            <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {stats.conversionRate.toFixed(1)}%
            </p>
          </section>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-4 rounded-[2.25rem] border border-outline-variant/10 bg-surface-container-low/30 p-4 sm:gap-6 sm:p-6 md:flex-row md:items-center">
          <Tabs
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full md:w-auto"
          >
            <TabsList className="h-14 w-full flex-nowrap justify-start overflow-x-auto rounded-2xl border border-outline-variant/5 bg-white p-1 shadow-subtle md:w-auto">
              <TabsTrigger
                value="all"
                className="h-12 shrink-0 rounded-xl px-4 font-black transition-all data-[state=active]:bg-primary data-[state=active]:text-white sm:px-6"
              >
                Alla
              </TabsTrigger>
              <TabsTrigger
                value="draft"
                className="h-12 shrink-0 rounded-xl px-4 font-black transition-all data-[state=active]:bg-primary data-[state=active]:text-white sm:px-6"
              >
                Utkast
              </TabsTrigger>
              <TabsTrigger
                value="awaiting"
                className="h-12 shrink-0 rounded-xl px-4 font-black transition-all data-[state=active]:bg-primary data-[state=active]:text-white sm:px-6"
              >
                Väntande
              </TabsTrigger>
              <TabsTrigger
                value="signed"
                className="h-12 shrink-0 rounded-xl px-4 font-black transition-all data-[state=active]:bg-primary data-[state=active]:text-white sm:px-6"
              >
                Signerade
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="h-12 shrink-0 rounded-xl px-4 font-black transition-all data-[state=active]:bg-primary data-[state=active]:text-white sm:px-6"
              >
                Avvisade
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Sök offerter..."
                className="rounded-2xl border-none bg-white py-6 pl-12 shadow-subtle focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-sm h-14 shadow-inner-subtle"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 md:flex md:items-center">
              <Button
                variant="outline"
                className="h-14 rounded-2xl border-none bg-white shadow-subtle transition-all active:scale-95 hover:bg-primary/5 hover:text-primary md:w-14 md:px-0"
                onClick={() => setLocation("/templates")}
              >
                <Layout size={20} className="md:mr-0 mr-2" />
                <span className="font-black md:hidden">Mallar</span>
              </Button>
              <Button
                className="h-14 rounded-2xl bg-primary-gradient px-6 font-black shadow-soft transition-all active:scale-95 hover:shadow-elevated md:px-8"
                onClick={() => setLocation("/templates")}
              >
                <Plus size={20} className="mr-2" />
                Ny offert
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <DashboardSkeleton />
          ) : filteredProposals.length === 0 ? (
            <section className="rounded-[2.5rem] border border-dashed border-outline-variant/30 bg-white/50 px-5 py-20 text-center animate-in fade-in zoom-in-95 duration-700 sm:px-6 sm:py-24 md:rounded-[3rem] md:py-32">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary/5 rotate-12 transition-transform duration-500 hover:rotate-0 sm:mb-10 sm:h-32 sm:w-32 sm:rounded-[2.5rem]">
                <FileText className="h-16 w-16 text-primary/20" />
              </div>
              <h2 className="mb-4 text-3xl font-black tracking-tighter text-on-surface sm:text-4xl">
                {search || statusFilter !== "all"
                  ? "Inga träffar"
                  : "Ditt arbetsbord är tomt"}
              </h2>
              <p className="mx-auto mb-10 max-w-md text-base font-medium leading-relaxed text-on-surface-variant/80 sm:mb-12 sm:text-lg">
                {search || statusFilter !== "all"
                  ? "Vi hittade ingen offert som matchar din sökning eller filter. Försök att ändra filterinställningarna."
                  : "Skapa din första offert för att komma igång. Du kan börja från scratch eller använda en färdig mall."}
              </p>
              
              {!search && statusFilter === "all" ? (
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {(Object.keys(TEMPLATE_CATEGORY_LABELS) as Array<keyof typeof TEMPLATE_CATEGORY_LABELS>).filter(k => k !== "alla").map((cat) => (
                    <Button
                      key={cat}
                      variant="outline"
                      className="rounded-2xl h-14 px-6 font-black bg-white shadow-subtle border-none hover:bg-primary/5 transition-all"
                      onClick={() => setLocation("/templates")}
                    >
                      {TEMPLATE_CATEGORY_LABELS[cat]}
                    </Button>
                  ))}
                  <Button
                    className="h-16 px-12 rounded-2xl bg-primary-gradient text-xl font-black shadow-elevated hover:scale-105 transition-all"
                    onClick={() => setLocation("/templates")}
                  >
                    Kom igång
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="h-14 px-8 rounded-2xl font-black text-primary hover:bg-primary/5"
                >
                  Återställ alla filter
                </Button>
              )}
            </section>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="space-y-4 md:hidden">
                {filteredProposals.map((proposal) => (
                  <section
                    key={proposal.id}
                    className="rounded-[2rem] border border-outline-variant/10 bg-white p-5 shadow-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setLocation(`/proposal/${proposal.id}`)}
                      >
                        <h3 className="line-clamp-2 text-lg font-black tracking-tight text-on-surface">
                          {proposal.title}
                        </h3>
                        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/45">
                          {proposal.clientName || "Namnlös kund"}
                        </p>
                      </button>
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
                          Senast ändrad
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
                        onClick={() => setLocation(`/proposal/${proposal.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Öppna
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl border-outline-variant/10 bg-white font-black"
                        onClick={() =>
                          window.open(
                            `${import.meta.env.BASE_URL}p/${proposal.publicSlug}`,
                            "_blank",
                          )
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Webbvy
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      className="mt-2 h-11 w-full rounded-2xl font-black text-error hover:bg-error/10 hover:text-error"
                      onClick={() => deleteProposal(proposal.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Radera permanent
                    </Button>
                  </section>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[2.5rem] border border-outline-variant/10 bg-white shadow-subtle md:block">
                <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left min-w-[800px]">
                  <thead>
                    <tr className="border-b border-outline-variant/5 bg-surface-container-low/30 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                      <th className="px-10 py-6">Offert & kund</th>
                      <th className="px-10 py-6 text-center">Status</th>
                      <th className="px-10 py-6">Värde</th>
                      <th className="px-10 py-6">Senast ändrad</th>
                      <th className="px-10 py-6 text-right">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {filteredProposals.map((proposal) => (
                      <tr
                        key={proposal.id}
                        className="group hover:bg-primary/[0.03] transition-all duration-500 cursor-pointer"
                        onClick={() => setLocation(`/proposal/${proposal.id}`)}
                      >
                        <td className="px-10 py-8">
                          <div
                            className="block text-left group-hover:translate-x-1 transition-transform duration-500"
                          >
                            <div className="font-black text-on-surface text-lg tracking-tight transition-colors group-hover:text-primary leading-tight">
                              {proposal.title}
                            </div>
                            <div className="mt-1.5 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">
                              {proposal.clientName || "Namnlös kund"}
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex justify-center transition-all duration-500 group-hover:scale-110">
                            <StatusBadge status={proposal.status} />
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="text-base font-black text-on-surface tracking-tight">
                            {formatCurrency(proposal.totalValue)}
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                            {formatDate(proposal.updatedAt)}
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl hover:bg-white hover:shadow-subtle transition-all active:scale-95"
                              >
                                <MoreHorizontal className="h-6 w-6 text-on-surface-variant" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-64 rounded-3xl p-3 shadow-elevated border-outline-variant/10 animate-in zoom-in-95 duration-300"
                            >
                              <DropdownMenuItem
                                className="rounded-xl py-4 px-4 font-black transition-colors"
                                onClick={() =>
                                  setLocation(`/proposal/${proposal.id}`)
                                }
                              >
                                <FileText className="mr-3 h-5 w-5 text-on-surface-variant" />
                                Redigera offert
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl py-4 px-4 font-black transition-colors"
                                onClick={() =>
                                  window.open(
                                    `${import.meta.env.BASE_URL}p/${proposal.publicSlug}`,
                                    "_blank",
                                  )
                                }
                              >
                                <Eye className="mr-3 h-5 w-5 text-on-surface-variant" />
                                Visa publik vy
                              </DropdownMenuItem>
                              <div className="my-2 h-[1px] bg-outline-variant/10" />
                              <DropdownMenuItem
                                className="text-error focus:text-error bg-error/[0.03] focus:bg-error/[0.08] rounded-xl py-4 px-4 font-black"
                                onClick={() => deleteProposal(proposal.id)}
                              >
                                <Trash2 className="mr-3 h-5 w-5" />
                                Radera permanent
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </>
  );
}
