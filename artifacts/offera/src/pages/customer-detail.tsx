import React from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  ExternalLink, 
  ChevronLeft, 
  FileText, 
  Link as LinkIcon,
  Trash2,
  Github,
  Globe,
  MoreVertical,
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  LayoutDashboard,
  ChevronRight,
  Search,
  Check,
  Loader2,
  Unlink,
  Pencil
} from "lucide-react";
import { api } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
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
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { StatusBadge } from "@/components/status-badge";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLinkLabelOpen, setIsLinkLabelOpen] = React.useState(false);
  const [newLink, setNewLink] = React.useState({ sectionName: "", label: "", url: "" });

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.getCustomer(id!),
    enabled: !!id,
  });

  const addLinkMutation = useMutation({
    mutationFn: (data: any) => api.addCustomerLink(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setIsLinkLabelOpen(false);
      setNewLink({ sectionName: "", label: "", url: "" });
      toast({ title: "Länk tillagd" });
    }
  });

  const deleteLinkMutation = useMutation({
    mutationFn: api.deleteCustomerLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Länk borttagen" });
    }
  });

  const unlinkProposalMutation = useMutation({
    mutationFn: (proposalId: number) => api.updateProposal(proposalId, { customerId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["proposals-all"] });
      toast({ title: "Offert bortkopplad" });
    },
    onError: () => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte koppla loss offerten.", 
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-surface-container-low rounded-xl" />
        <div className="h-64 bg-surface-container-low rounded-3xl" />
      </div>
    );
  }

  if (!customer) return null;

  // Group links by section
  const groupedLinks = customer.links.reduce((acc: any, link: any) => {
    if (!acc[link.sectionName]) acc[link.sectionName] = [];
    acc[link.sectionName].push(link);
    return acc;
  }, {});

  const sections = Object.keys(groupedLinks);

  const getLinkIcon = (url: string) => {
    if (url.includes("github.com")) return <Github size={18} />;
    if (url.includes("slack.com")) return <LinkIcon size={18} />;
    return <Globe size={18} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
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
          <p className="text-on-surface-variant flex items-center gap-2 mt-1">
            <Clock size={14} />
            Kund sedan {format(new Date(customer.createdAt), "MMMM yyyy", { locale: sv })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info & Proposals */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Info Card */}
          <Card className="rounded-[2.5rem] border-outline-variant/15 bg-white shadow-elevated overflow-hidden border">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-display font-bold">Företagsinformation</CardTitle>
                <EditCustomerDialog customer={customer} />
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Organisationsnummer</h5>
                  <p className="font-bold text-slate-900">{customer.orgNumber || "—"}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Kontaktperson</h5>
                  <p className="font-bold text-slate-900">{customer.contactPerson || "—"}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">E-post</h5>
                  <p className="font-bold text-slate-900">{customer.email || "—"}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Telefon</h5>
                  <p className="font-bold text-slate-900">{customer.phone || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Adress</h5>
                  <p className="font-bold text-slate-900">
                    {customer.address || "—"}<br />
                    {customer.postalCode} {customer.city}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-outline-variant/15 bg-white shadow-elevated overflow-hidden border">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-display font-bold">Avtal & Offerter</CardTitle>
                  <CardDescription className="text-base mt-2">Signerade avtal och utkast kopplade till kunden.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <LinkProposalDialog 
                    customerId={id!} 
                    currentProposalIds={customer.proposals.map((p: any) => p.id)} 
                  />
                  <Button 
                    className="rounded-xl h-10 px-4 bg-primary text-white"
                    onClick={() => setLocation(`/templates?customer_id=${customer.id}`)}
                  >
                    <Plus size={18} className="mr-2" />
                    Ny offert
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {(customer.proposals && customer.proposals.length > 0) ? (
                <div className="space-y-4">
                  {customer.proposals.map((proposal: any) => (
                    <div 
                      key={proposal.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/10 transition-all cursor-pointer"
                      onClick={() => setLocation(`/proposal/${proposal.id}`)}
                    >
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-subtle group-hover:scale-110 transition-transform">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors leading-none mb-1.5">{proposal.title}</h4>
                          <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={12} />
                              {format(new Date(proposal.updatedAt), "d MMM yyyy", { locale: sv })}
                            </span>
                            <span className="text-slate-900 font-bold tracking-normal underline decoration-primary/30">
                              {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(Number(proposal.totalValue))}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <StatusBadge status={proposal.status} />
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Koppla loss offerten från kunden? Den kommer fortfarande finnas kvar på din dashboard.")) {
                                unlinkProposalMutation.mutate(proposal.id);
                              }
                            }}
                            disabled={unlinkProposalMutation.isPending}
                          >
                            {unlinkProposalMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Unlink size={14} />
                            )}
                          </Button>
                          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-on-surface-variant group-hover:translate-x-1 transition-transform border border-outline-variant/15 shadow-subtle">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-surface-container-low/50 rounded-3xl border border-dashed border-outline-variant/20">
                  <p className="text-on-surface-variant mb-4">Inga offerter än.</p>
                  <Button variant="outline" className="rounded-xl" onClick={() => setLocation(`/templates?customer_id=${customer.id}`)}>
                    Skapa första offerten
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Links & Resources */}
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-outline-variant/15 bg-surface-container-low shadow-subtle border h-full">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-display font-bold">Resurser</CardTitle>
                  <CardDescription className="text-sm mt-1">Länkar, repos och system.</CardDescription>
                </div>
                <Dialog open={isLinkLabelOpen} onOpenChange={setIsLinkLabelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white shadow-subtle hover:bg-white active:scale-90 transition-all border border-outline-variant/15">
                      <PlusCircle size={20} className="text-primary" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-display font-bold">Lägg till länk</DialogTitle>
                      <DialogDescription className="sr-only">Spara en ny resurslänk för denna kund.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Sektion</Label>
                        <Input 
                          placeholder="t.ex. GitHub, Dokumentation"
                          className="h-12 rounded-xl"
                          value={newLink.sectionName}
                          onChange={(e) => setNewLink(prev => ({ ...prev, sectionName: e.target.value }))}
                          list="sections-list"
                        />
                        <datalist id="sections-list">
                          {sections.map(s => <option key={s} value={s} />)}
                        </datalist>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Beskrivning</Label>
                        <Input 
                          placeholder="t.ex. Frontend Repo"
                          className="h-12 rounded-xl"
                          value={newLink.label}
                          onChange={(e) => setNewLink(prev => ({ ...prev, label: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">URL</Label>
                        <Input 
                          placeholder="https://..."
                          className="h-12 rounded-xl"
                          value={newLink.url}
                          onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="h-12 px-6 rounded-xl bg-primary text-white w-full"
                        disabled={!newLink.label || !newLink.url || addLinkMutation.isPending}
                        onClick={() => addLinkMutation.mutate(newLink)}
                      >
                        Spara resurs
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
                        {groupedLinks[section].map((link: any) => (
                          <div 
                            key={link.id}
                            className="group flex items-center justify-between p-4 rounded-xl bg-white hover:bg-white border border-outline-variant/5 hover:border-primary/20 hover:shadow-subtle transition-all cursor-pointer"
                            onClick={() => window.open(link.url, '_blank')}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-on-surface-variant/40 group-hover:text-primary transition-colors">
                                {getLinkIcon(link.url)}
                              </div>
                              <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
                                {link.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Ta bort länken?")) {
                                    deleteLinkMutation.mutate(link.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                              <ExternalLink size={14} className="text-on-surface-variant/30 ml-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="text-sm text-on-surface-variant italic">Inga resurser tillagda än.</p>
                  </div>
                )}
              </div>
            </CardContent>

            <div className="p-8 mt-auto pt-0">
               <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col items-center text-center">
                  <Badge variant="outline" className="mb-4 bg-white/50 border-primary/20 text-primary font-bold tracking-tight">CRM Smart Hub</Badge>
                  <p className="text-xs text-on-surface-variant">Spara alla dina kundspecifika resurser på ett ställe för snabb åtkomst.</p>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditCustomerDialog({ customer }: { customer: any }) {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: (customer as any).name,
    email: (customer as any).email || "",
    orgNumber: (customer as any).orgNumber || "",
    contactPerson: (customer as any).contactPerson || "",
    phone: (customer as any).phone || "",
    address: (customer as any).address || "",
    postalCode: (customer as any).postalCode || "",
    city: (customer as any).city || ""
  });

  // Keep form data in sync with customer data
  React.useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email || "",
        orgNumber: customer.orgNumber || "",
        contactPerson: customer.contactPerson || "",
        phone: customer.phone || "",
        address: customer.address || "",
        postalCode: customer.postalCode || "",
        city: customer.city || ""
      });
    }
  }, [customer]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (data: any) => {
      // Clean up data before sending (empty strings to null for optional fields)
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === "" && key !== "name") {
          cleanData[key] = null;
        }
      });
      return api.updateCustomer(customer.id, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Kunduppgifter uppdaterade" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Fel", 
        description: error instanceof Error ? error.message : "Kunde inte uppdatera kunden.", 
        variant: "destructive" 
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-surface-container-low transition-colors">
          <Pencil size={16} className="text-on-surface-variant" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">Redigera kunduppgifter</DialogTitle>
          <DialogDescription>Uppdatera företagets information i CRM.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Företagsnamn</Label>
              <Input 
                id="edit-name" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-org" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Organisationsnummer</Label>
              <Input 
                id="edit-org" 
                value={formData.orgNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, orgNumber: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-contact" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Kontaktperson</Label>
              <Input 
                id="edit-contact" 
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">E-postadress</Label>
              <Input 
                id="edit-email" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-phone" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Telefonnummer</Label>
            <Input 
              id="edit-phone" 
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-address" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Fullständig Adress</Label>
            <Input 
              id="edit-address" 
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-postal" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Postnummer</Label>
              <Input 
                id="edit-postal" 
                value={formData.postalCode}
                onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-city" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Stad / Ort</Label>
              <Input 
                id="edit-city" 
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button 
            className="h-12 px-6 rounded-xl bg-primary text-white"
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
          >
            Spara ändringar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function LinkProposalDialog({ customerId, currentProposalIds }: { customerId: string, currentProposalIds: number[] }) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals-all"],
    queryFn: api.listProposals,
    enabled: open
  });

  const linkMutation = useMutation({
    mutationFn: (proposalId: number) => api.updateProposal(proposalId, { customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["proposals-all"] });
      toast({ title: "Offert kopplad", description: "Offerten har kopplats till kunden." });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte koppla offerten.", variant: "destructive" });
    }
  });

  const filteredProposals = proposals.filter(p => 
    !currentProposalIds.includes(p.id) &&
    (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all">
          <LinkIcon size={16} className="mr-2" />
          Koppla befintlig
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">Koppla befintlig offert</DialogTitle>
          <DialogDescription>Sök och välj en offert att koppla till denna kund.</DialogDescription>
        </DialogHeader>
        
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
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
              <p className="text-sm text-on-surface-variant">Hämtar offerter...</p>
            </div>
          ) : filteredProposals.length > 0 ? (
            filteredProposals.map(proposal => (
              <div 
                key={proposal.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 hover:bg-white transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 truncate">{proposal.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                    <span className="truncate">{proposal.clientName || "Ingen kund angiven"}</span>
                    <span>•</span>
                    <span>{format(new Date(proposal.updatedAt), "d MMM yyyy", { locale: sv })}</span>
                  </div>
                  {proposal.customerId && (
                    <Badge variant="outline" className="mt-1 text-[10px] py-0 h-4 bg-amber-50 text-amber-600 border-amber-200">
                      Redan kopplad till annan kund
                    </Badge>
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="rounded-lg ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => linkMutation.mutate(proposal.id)}
                  disabled={linkMutation.isPending}
                >
                  {linkMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : "Välj"}
                </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-on-surface-variant">Inga matchande offerter hittades.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
