import React from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateCustomerLinkBody } from "@workspace/api-zod";
import {
  Activity,
  AlertCircle,
  Plus,
  ExternalLink,
  ChevronLeft,
  FileText,
  Link as LinkIcon,
  Trash2,
  Github,
  Globe,
  PlusCircle,
  Clock,
  Calendar,
  ChevronRight,
  Search,
  Loader2,
  Unlink,
  Pencil,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import {
  api,
  type CreateCustomerLinkRequest,
  type CustomerDetail,
  type CustomerLink,
} from "@/lib/api";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/custom-confirm";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/document";
import {
  applyCustomerTax,
  formatCustomerTaxRate,
  formatCustomerBinding,
  formatCustomerValue,
  getCustomerAnnualValue,
  getCustomerCommittedValue,
  getCustomerMonthlyValue,
  hasCustomerValue,
} from "@/lib/customer-value";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [isLinkLabelOpen, setIsLinkLabelOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [newLink, setNewLink] = React.useState({
    sectionName: "",
    label: "",
    url: "",
  });
  const [linkErrors, setLinkErrors] = React.useState<
    Partial<Record<keyof CreateCustomerLinkRequest, string>>
  >({});

  const {
    data: customer,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.getCustomer(id!),
    enabled: !!id,
  });

  const addLinkMutation = useMutation({
    mutationFn: (data: CreateCustomerLinkRequest) =>
      api.addCustomerLink(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setIsLinkLabelOpen(false);
      setNewLink({ sectionName: "", label: "", url: "" });
      setLinkErrors({});
      toast({ title: "Länk tillagd" });
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte lägga till länken",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: api.deleteCustomerLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Länk borttagen" });
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte ta bort länken",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.updateCustomer>[1]) =>
      api.updateCustomer(id!, data),
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Kunduppgifter uppdaterade",
        description: `${updatedCustomer.name} har sparats.`,
      });
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte uppdatera kunden",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const unlinkProposalMutation = useMutation({
    mutationFn: (proposalId: number) =>
      api.updateProposal(proposalId, { customerId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["proposals-all"] });
      toast({ title: "Offert bortkopplad" });
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte koppla loss offerten",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const submitLink = () => {
    const result = CreateCustomerLinkBody.safeParse({
      sectionName: newLink.sectionName.trim() || "Länkar",
      label: newLink.label,
      url: newLink.url,
    });
    if (!result.success) {
      const nextErrors: Partial<
        Record<keyof CreateCustomerLinkRequest, string>
      > = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === "sectionName" || field === "label" || field === "url") {
          nextErrors[field] ??= issue.message;
        }
      }
      setLinkErrors(nextErrors);
      return;
    }
    addLinkMutation.mutate(result.data);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-surface-container-low rounded-xl" />
        <div className="h-64 bg-surface-container-low rounded-3xl" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 text-center">
        <AlertCircle className="mb-4 text-destructive" size={30} />
        <h1 className="text-xl font-bold text-slate-900">
          Kunden kunde inte hämtas
        </h1>
        <p className="mt-2 max-w-md text-sm text-on-surface-variant">
          {error instanceof Error
            ? error.message
            : "Kunden finns inte längre eller så saknar du åtkomst."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setLocation("/customers")}
          >
            Till kundlistan
          </Button>
          <Button className="rounded-xl" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Försök igen
          </Button>
        </div>
      </div>
    );
  }

  const customerProposals = customer.proposals;
  const groupedLinks = customer.links.reduce<Record<string, CustomerLink[]>>(
    (acc, link) => {
      if (!acc[link.sectionName]) acc[link.sectionName] = [];
      acc[link.sectionName].push(link);
      return acc;
    },
    {},
  );

  const sections = Object.keys(groupedLinks);

  const activityItems = [
    ...customerProposals.map((proposal) => ({
      id: `proposal-${proposal.id}`,
      title:
        proposal.status === "accepted"
          ? "Offert accepterad"
          : "Offert uppdaterad",
      description: proposal.title,
      date: new Date(proposal.updatedAt),
    })),
    {
      id: "customer-updated",
      title: "Kundprofil uppdaterad",
      description: "Kontakt- eller avtalsuppgifter ändrades.",
      date: new Date(customer.updatedAt),
    },
    {
      id: "customer-created",
      title: "Kund skapad",
      description: "Kundprofilen lades till i CRM.",
      date: new Date(customer.createdAt),
    },
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const getLinkIcon = (url: string) => {
    if (url.includes("github.com")) return <Github size={18} />;
    if (url.includes("slack.com")) return <LinkIcon size={18} />;
    return <Globe size={18} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-xl bg-surface-container-low border border-outline-variant/15 hover:bg-white transition-all shadow-subtle"
            onClick={() => setLocation("/customers")}
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              {customer.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-on-surface-variant">
              <p className="flex items-center gap-2">
                <Clock size={14} />
                Kund sedan{" "}
                {format(new Date(customer.createdAt), "MMMM yyyy", {
                  locale: sv,
                })}
              </p>
              {hasCustomerValue(customer) ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary"
                >
                  {formatCustomerValue(customer.value, customer.valuePeriod)}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {customer.email ? (
            <Button variant="outline" className="h-10 rounded-xl" asChild>
              <a href={`mailto:${customer.email}`}>
                <Mail className="mr-2 h-4 w-4" /> E-post
              </a>
            </Button>
          ) : null}
          {customer.phone ? (
            <Button variant="outline" className="h-10 rounded-xl" asChild>
              <a href={`tel:${customer.phone}`}>
                <Phone className="mr-2 h-4 w-4" /> Ring
              </a>
            </Button>
          ) : null}
          <CustomerFormDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            customer={customer}
            onSubmit={(data) => updateCustomerMutation.mutate(data)}
            isPending={updateCustomerMutation.isPending}
            trigger={
              <Button className="h-10 rounded-xl">
                <Pencil className="mr-2 h-4 w-4" /> Redigera
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info & Proposals */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Info Card */}
          <Card className="rounded-[2.5rem] border-outline-variant/15 bg-white shadow-elevated overflow-hidden border">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-display font-bold">
                  Företagsinformation
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Kundvärde
                  </h5>
                  <p className="font-bold text-slate-900">
                    {formatCustomerValue(customer.value, customer.valuePeriod)}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Årsvärde
                  </h5>
                  <p className="font-bold text-slate-900">
                    {hasCustomerValue(customer)
                      ? formatCurrency(getCustomerAnnualValue(customer))
                      : "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Månadsvärde
                  </h5>
                  <p className="font-bold text-slate-900">
                    {hasCustomerValue(customer)
                      ? formatCurrency(getCustomerMonthlyValue(customer))
                      : "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Bindningstid
                  </h5>
                  <p className="font-bold text-slate-900">
                    {formatCustomerBinding(customer.bindingMonths)}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Moms
                  </h5>
                  <p className="font-bold text-slate-900">
                    {formatCustomerTaxRate(customer.taxRate)}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Bundet avtalsvärde
                  </h5>
                  <p className="font-bold text-slate-900">
                    {customer.bindingMonths && hasCustomerValue(customer)
                      ? formatCurrency(
                          applyCustomerTax(
                            getCustomerCommittedValue(customer),
                            customer.taxRate,
                          ),
                        )
                      : "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Årsvärde inkl moms
                  </h5>
                  <p className="font-bold text-slate-900">
                    {hasCustomerValue(customer)
                      ? formatCurrency(
                          applyCustomerTax(
                            getCustomerAnnualValue(customer),
                            customer.taxRate,
                          ),
                        )
                      : "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Organisationsnummer
                  </h5>
                  <p className="font-bold text-slate-900">
                    {customer.orgNumber || "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Kontaktperson
                  </h5>
                  <p className="font-bold text-slate-900">
                    {customer.contactPerson || "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    E-post
                  </h5>
                  <p className="font-bold text-slate-900">
                    {customer.email || "—"}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Telefon
                  </h5>
                  <p className="font-bold text-slate-900">
                    {customer.phone || "—"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                    Adress
                  </h5>
                  <p className="font-bold text-slate-900">
                    {[
                      customer.address,
                      [customer.postalCode, customer.city]
                        .filter(Boolean)
                        .join(" "),
                    ]
                      .filter(Boolean)
                      .map((line) => (
                        <React.Fragment key={line}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))}
                    {!customer.address && !customer.postalCode && !customer.city
                      ? "—"
                      : null}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-outline-variant/15 bg-white shadow-elevated overflow-hidden border">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-display font-bold">
                    Avtal & Offerter
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Signerade avtal och utkast kopplade till kunden.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <LinkProposalDialog
                    customerId={id!}
                    currentProposalIds={customerProposals.map(
                      (proposal) => proposal.id,
                    )}
                  />
                  <Button
                    className="rounded-xl h-10 px-4 bg-primary text-white"
                    onClick={() =>
                      setLocation(`/templates?customer_id=${customer.id}`)
                    }
                  >
                    <Plus size={18} className="mr-2" />
                    Ny offert
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {customerProposals.length > 0 ? (
                <div className="space-y-4">
                  {customerProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="group flex items-center gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-3 transition-all hover:bg-surface-container-high sm:p-4"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl p-2 text-left sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => setLocation(`/proposal/${proposal.id}`)}
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-subtle transition-transform group-hover:scale-105">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-bold leading-none text-slate-900 transition-colors group-hover:text-primary">
                              {proposal.title}
                            </h4>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                              <span className="flex items-center gap-1.5">
                                <Calendar size={12} />
                                {format(
                                  new Date(proposal.updatedAt),
                                  "d MMM yyyy",
                                  { locale: sv },
                                )}
                              </span>
                              <span className="font-bold tracking-normal text-slate-900">
                                {new Intl.NumberFormat("sv-SE", {
                                  style: "currency",
                                  currency: "SEK",
                                }).format(Number(proposal.totalValue))}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 self-stretch sm:self-auto">
                          <StatusBadge status={proposal.status} />
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/15 bg-white text-on-surface-variant shadow-subtle transition-transform group-hover:translate-x-0.5">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: "Koppla loss offerten?",
                            description:
                              "Offerten finns kvar på dashboarden men visas inte längre på kundprofilen.",
                            confirmLabel: "Koppla loss",
                            variant: "destructive",
                          });
                          if (confirmed) {
                            unlinkProposalMutation.mutate(proposal.id);
                          }
                        }}
                        disabled={
                          unlinkProposalMutation.isPending &&
                          unlinkProposalMutation.variables === proposal.id
                        }
                        aria-label={`Koppla loss ${proposal.title}`}
                      >
                        {unlinkProposalMutation.isPending &&
                        unlinkProposalMutation.variables === proposal.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unlink size={15} />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-surface-container-low/50 rounded-3xl border border-dashed border-outline-variant/20">
                  <p className="text-on-surface-variant mb-4">
                    Inga offerter än.
                  </p>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() =>
                      setLocation(`/templates?customer_id=${customer.id}`)
                    }
                  >
                    Skapa första offerten
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Links & Resources */}
        <div className="space-y-8">
          <Card className="rounded-[2rem] border-outline-variant/15 bg-white shadow-subtle border">
            <CardHeader className="p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-primary">
                  <Activity size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg font-display font-bold">
                    Aktivitet
                  </CardTitle>
                  <CardDescription>
                    Senaste händelserna för kunden.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-3">
              <ol className="space-y-0">
                {activityItems.map((item, index) => (
                  <li
                    key={item.id}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {index < activityItems.length - 1 ? (
                      <span
                        className="absolute left-[5px] top-3 h-full w-px bg-outline-variant/20"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {item.description}
                      </p>
                      <time
                        className="mt-1 block text-[11px] text-on-surface-variant/70"
                        dateTime={item.date.toISOString()}
                      >
                        {format(item.date, "d MMM yyyy, HH:mm", { locale: sv })}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-outline-variant/15 bg-surface-container-low shadow-subtle border">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-display font-bold">
                    Resurser
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Länkar, repos och system.
                  </CardDescription>
                </div>
                <Dialog
                  open={isLinkLabelOpen}
                  onOpenChange={(open) => {
                    setIsLinkLabelOpen(open);
                    if (open) setLinkErrors({});
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl bg-white shadow-subtle hover:bg-white active:scale-90 transition-all border border-outline-variant/15"
                    >
                      <PlusCircle size={20} className="text-primary" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-display font-bold">
                        Lägg till länk
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Spara en ny resurslänk för denna kund.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="link-section">Sektion</Label>
                        <Input
                          id="link-section"
                          placeholder="Länkar"
                          className="h-12 rounded-xl"
                          value={newLink.sectionName}
                          onChange={(e) => {
                            setNewLink((prev) => ({
                              ...prev,
                              sectionName: e.target.value,
                            }));
                            setLinkErrors((prev) => ({
                              ...prev,
                              sectionName: undefined,
                            }));
                          }}
                          list="sections-list"
                          aria-invalid={Boolean(linkErrors.sectionName)}
                        />
                        <p className="text-xs text-on-surface-variant">
                          Lämna tomt för standardsektionen Länkar.
                        </p>
                        {linkErrors.sectionName ? (
                          <p className="text-xs font-medium text-destructive">
                            {linkErrors.sectionName}
                          </p>
                        ) : null}
                        <datalist id="sections-list">
                          {sections.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="link-label">Beskrivning</Label>
                        <Input
                          id="link-label"
                          placeholder="T.ex. Projektmapp"
                          className="h-12 rounded-xl"
                          value={newLink.label}
                          onChange={(e) => {
                            setNewLink((prev) => ({
                              ...prev,
                              label: e.target.value,
                            }));
                            setLinkErrors((prev) => ({
                              ...prev,
                              label: undefined,
                            }));
                          }}
                          aria-invalid={Boolean(linkErrors.label)}
                        />
                        {linkErrors.label ? (
                          <p className="text-xs font-medium text-destructive">
                            {linkErrors.label}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="link-url">URL</Label>
                        <Input
                          id="link-url"
                          type="url"
                          inputMode="url"
                          placeholder="https://..."
                          className="h-12 rounded-xl"
                          value={newLink.url}
                          onChange={(e) => {
                            setNewLink((prev) => ({
                              ...prev,
                              url: e.target.value,
                            }));
                            setLinkErrors((prev) => ({
                              ...prev,
                              url: undefined,
                            }));
                          }}
                          aria-invalid={Boolean(linkErrors.url)}
                        />
                        {linkErrors.url ? (
                          <p className="text-xs font-medium text-destructive">
                            {linkErrors.url}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        className="h-12 px-6 rounded-xl bg-primary text-white w-full"
                        disabled={addLinkMutation.isPending}
                        onClick={submitLink}
                      >
                        {addLinkMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {addLinkMutation.isPending
                          ? "Sparar..."
                          : "Spara resurs"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="space-y-8">
                {sections.length > 0 ? (
                  sections.map((section: string) => (
                    <div key={section} className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 border-b border-outline-variant/10 pb-2">
                        {section}
                      </h5>
                      <div className="space-y-2">
                        {groupedLinks[section].map((link) => (
                          <div
                            key={link.id}
                            className="group flex items-center justify-between gap-2 rounded-xl border border-outline-variant/5 bg-white p-2 pl-4 transition-all hover:border-primary/20 hover:shadow-subtle"
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2"
                            >
                              <div className="text-on-surface-variant/40 group-hover:text-primary transition-colors">
                                {getLinkIcon(link.url)}
                              </div>
                              <span className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-primary">
                                {link.label}
                              </span>
                              <ExternalLink
                                size={13}
                                className="shrink-0 text-on-surface-variant/30"
                              />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10"
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: "Ta bort länken?",
                                  description: `${link.label} tas bort permanent från kundprofilen.`,
                                  confirmLabel: "Ta bort länk",
                                  variant: "destructive",
                                });
                                if (confirmed) {
                                  deleteLinkMutation.mutate(link.id);
                                }
                              }}
                              disabled={
                                deleteLinkMutation.isPending &&
                                deleteLinkMutation.variables === link.id
                              }
                              aria-label={`Ta bort ${link.label}`}
                            >
                              {deleteLinkMutation.isPending &&
                              deleteLinkMutation.variables === link.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="text-sm text-on-surface-variant italic">
                      Inga resurser tillagda än.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LinkProposalDialog({
  customerId,
  currentProposalIds,
}: {
  customerId: string;
  currentProposalIds: number[];
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const {
    data: proposals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["proposals-all"],
    queryFn: api.listProposals,
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: (proposalId: number) =>
      api.updateProposal(proposalId, { customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["proposals-all"] });
      toast({
        title: "Offert kopplad",
        description: "Offerten har kopplats till kunden.",
      });
      setOpen(false);
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte koppla offerten",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const filteredProposals = proposals.filter(
    (p) =>
      !currentProposalIds.includes(p.id) &&
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const linkProposal = async (proposal: (typeof proposals)[number]) => {
    if (proposal.customerId) {
      const confirmed = await confirm({
        title: "Flytta offerten till denna kund?",
        description:
          "Offerten är redan kopplad till en annan kund. Den befintliga kopplingen ersätts.",
        confirmLabel: "Flytta offert",
        variant: "destructive",
      });
      if (!confirmed) return;
    }
    linkMutation.mutate(proposal.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-4 rounded-xl border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all"
        >
          <LinkIcon size={16} className="mr-2" />
          Koppla befintlig
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">
            Koppla befintlig offert
          </DialogTitle>
          <DialogDescription>
            Sök och välj en offert att koppla till denna kund.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
            size={18}
          />
          <Input
            placeholder="Sök efter titel eller kundnamn..."
            className="h-11 pl-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary mb-2" size={32} />
              <p className="text-sm text-on-surface-variant">
                Hämtar offerter...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-3 text-destructive" size={24} />
              <p className="text-sm font-medium text-slate-900">
                Offerterna kunde inte hämtas
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={() => void refetch()}
              >
                Försök igen
              </Button>
            </div>
          ) : filteredProposals.length > 0 ? (
            filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 hover:bg-white transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 truncate">
                    {proposal.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                    <span className="truncate">
                      {proposal.clientName || "Ingen kund angiven"}
                    </span>
                    <span>•</span>
                    <span>
                      {format(new Date(proposal.updatedAt), "d MMM yyyy", {
                        locale: sv,
                      })}
                    </span>
                  </div>
                  {proposal.customerId && (
                    <Badge
                      variant="outline"
                      className="mt-1 text-[10px] py-0 h-4 bg-amber-50 text-amber-600 border-amber-200"
                    >
                      Redan kopplad till annan kund
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="rounded-lg ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => void linkProposal(proposal)}
                  disabled={linkMutation.isPending}
                >
                  {linkMutation.isPending &&
                  linkMutation.variables === proposal.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    "Välj"
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-on-surface-variant">
                Inga matchande offerter hittades.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
