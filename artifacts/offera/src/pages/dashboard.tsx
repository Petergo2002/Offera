import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { 
  Plus, 
  FileText, 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  Search,
  Loader2
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { 
  getListProposalsQueryOptions,
  useCreateProposal, 
  useDeleteProposal 
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: proposals, isLoading, refetch } = useQuery(getListProposalsQueryOptions());
  const { mutateAsync: createProposal, isPending: isCreating } = useCreateProposal();
  const { mutateAsync: deleteProposal } = useDeleteProposal();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClientName, setNewClientName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClientName.trim()) return;

    try {
      const res = await createProposal({
        data: {
          title: newTitle,
          clientName: newClientName,
        }
      });
      setIsCreateOpen(false);
      toast({ title: "Offert skapad", description: "Omdirigerar till editorn..." });
      setLocation(`/proposal/${res.id}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Fel", description: "Kunde inte skapa offerten." });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Är du säker på att du vill radera denna offert?")) return;
    try {
      await deleteProposal({ id });
      toast({ title: "Offert raderad" });
      refetch();
    } catch (error) {
      toast({ variant: "destructive", title: "Fel", description: "Kunde inte radera." });
    }
  };

  const filteredProposals = proposals?.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.clientName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const formatCurrency = (val: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(val);
  const formatDate = (dateStr: string) => format(new Date(dateStr), "d MMM yyyy", { locale: sv });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Premium Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col text-sidebar-foreground">
        <div className="p-6">
          <div className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-white">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <FileText size={18} strokeWidth={2.5} />
            </div>
            Offera
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium transition-colors">
            <FileText size={18} />
            Alla Offerter
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <header className="h-20 border-b px-8 flex items-center justify-between bg-white shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dina offerter</h1>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                <Plus size={18} />
                Ny offert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Skapa ny offert</DialogTitle>
                  <DialogDescription>
                    Ange ett namn och kund för att börja bygga din offert.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Projektnamn / Offertitel</Label>
                    <Input 
                      id="title" 
                      placeholder="t.ex. Webbplats Redesign 2025" 
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Kundnamn (Företag)</Label>
                    <Input 
                      id="client" 
                      placeholder="t.ex. Acme Corp AB" 
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Avbryt</Button>
                  <Button type="submit" disabled={isCreating || !newTitle || !newClientName}>
                    {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Skapa och redigera
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                placeholder="Sök offerter eller kunder..." 
                className="pl-10 py-5 rounded-xl border-border bg-white shadow-subtle focus-visible:ring-primary/20"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredProposals.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 px-6 bg-white border border-dashed rounded-2xl"
              >
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Inga offerter hittades</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {search ? "Justera din sökning för att hitta det du letar efter." : "Du har inte skapat några offerter ännu. Klicka på 'Ny offert' för att komma igång."}
                </p>
                {!search && <Button onClick={() => setIsCreateOpen(true)}>Skapa din första offert</Button>}
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl shadow-subtle border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50/50 text-sm font-medium text-muted-foreground">
                      <th className="px-6 py-4">Offert & Kund</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Totalt Värde</th>
                      <th className="px-6 py-4">Skapad</th>
                      <th className="px-6 py-4 text-right">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProposals.map(proposal => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={proposal.id} 
                        className="group hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link href={`/proposal/${proposal.id}`} className="block">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {proposal.title}
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {proposal.clientName}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={proposal.status} />
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {formatCurrency(proposal.totalValue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(proposal.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setLocation(`/proposal/${proposal.id}`)}>
                                <FileText className="mr-2 h-4 w-4" /> Redigera
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`${import.meta.env.BASE_URL}p/${proposal.publicSlug}`, '_blank')}>
                                <Eye className="mr-2 h-4 w-4" /> Visa publik länk
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(proposal.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Radera
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
