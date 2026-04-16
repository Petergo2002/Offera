import React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  ChevronRight, 
  MoreVertical,
  Trash2,
  ExternalLink,
  User as UserIcon
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

export default function CustomersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({ 
    name: "", 
    email: "",
    orgNumber: "",
    contactPerson: "",
    phone: "",
    address: "",
    postalCode: "",
    city: ""
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: api.listCustomers,
  });

  const createCustomerMutation = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsCreateDialogOpen(false);
      setNewCustomer({ 
        name: "", 
        email: "",
        orgNumber: "",
        contactPerson: "",
        phone: "",
        address: "",
        postalCode: "",
        city: ""
      });
      toast({ title: "Kund skapad", description: "Kunden har lagts till i CRM." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ett fel uppstod", 
        description: error instanceof Error ? error.message : "Kunde inte skapa kunden.", 
        variant: "destructive" 
      });
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Kund borttagen" });
    }
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900">Kunder</h1>
          <p className="mt-2 text-on-surface-variant max-w-2xl">
            Hantera dina kundrelationer, projektreferenser och signerade avtal.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl bg-primary-gradient text-white shadow-elevated hover:shadow-hover transition-all group shrink-0">
              <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Ny kund
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display font-bold">Skapa ny kund</DialogTitle>
              <DialogDescription>Fyll i företagsuppgifter för att lägga till en ny kund i CRM.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Företagsnamn</Label>
                  <Input 
                    id="name" 
                    placeholder="T.ex. Antigravity AB"
                    className="h-12 rounded-xl"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orgNumber" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Organisationsnummer</Label>
                  <Input 
                    id="orgNumber" 
                    placeholder="556677-8899"
                    className="h-12 rounded-xl"
                    value={newCustomer.orgNumber}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, orgNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Kontaktperson</Label>
                  <Input 
                    id="contactPerson" 
                    placeholder="För- och efternamn"
                    className="h-12 rounded-xl"
                    value={newCustomer.contactPerson}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, contactPerson: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">E-postadress</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="namn@foretag.se"
                    className="h-12 rounded-xl"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Telefonnummer</Label>
                <Input 
                  id="phone" 
                  placeholder="070-123 45 67"
                  className="h-12 rounded-xl"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Fullständig Adress</Label>
                <Input 
                  id="address" 
                  placeholder="Gatunamn 123"
                  className="h-12 rounded-xl"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="postalCode" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Postnummer</Label>
                  <Input 
                    id="postalCode" 
                    placeholder="123 45"
                    className="h-12 rounded-xl"
                    value={newCustomer.postalCode}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, postalCode: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Stad / Ort</Label>
                  <Input 
                    id="city" 
                    placeholder="Stockholm"
                    className="h-12 rounded-xl"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                className="h-12 px-6 rounded-xl"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Avbryt
              </Button>
              <Button 
                className="h-12 px-6 rounded-xl bg-primary text-white"
                disabled={!newCustomer.name || createCustomerMutation.isPending}
                onClick={() => createCustomerMutation.mutate(newCustomer)}
              >
                Spara kund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
        <Input 
          placeholder="Sök efter kundnamn eller e-post..." 
          className="h-14 pl-12 pr-4 bg-surface-container-low border-outline-variant/15 rounded-2xl shadow-subtle focus:shadow-md transition-all text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-3xl bg-surface-container-low animate-pulse border border-outline-variant/10" />
          ))}
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <Card 
              key={customer.id} 
              className="group rounded-3xl border-outline-variant/15 bg-surface-container-low hover:bg-white hover:shadow-elevated transition-all duration-300 cursor-pointer overflow-hidden border"
              onClick={() => setLocation(`/customers/${customer.id}`)}
            >
              <CardContent className="p-0">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                      <UserIcon size={28} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-surface-container-high transition-colors">
                          <MoreVertical size={20} className="text-on-surface-variant" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-outline-variant/15 shadow-elevated p-1.5">
                        <DropdownMenuItem 
                          className="text-error focus:text-error rounded-lg flex items-center gap-2 px-3 py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Är du säker på att du vill ta bort ${customer.name}?`)) {
                              deleteCustomerMutation.mutate(customer.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                          Ta bort
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight mb-2">
                    {customer.name}
                  </h3>
                  
                  {customer.email && (
                    <div className="flex items-center gap-2 text-on-surface-variant mb-4">
                      <Mail size={14} />
                      <span className="text-sm truncate font-medium">{customer.email}</span>
                    </div>
                  )}
                  
                  <div className="pt-6 mt-6 border-t border-outline-variant/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50">
                      Visa profil
                    </span>
                    <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:translate-x-1 transition-transform duration-300 border border-outline-variant/15">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-surface-container-low rounded-[3rem] border border-dashed border-outline-variant/30">
          <div className="h-20 w-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/30 mb-6">
            <Users size={40} />
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">Inga kunder hittades</h3>
          <p className="text-on-surface-variant max-w-sm">
            {searchQuery 
              ? "Din sökning matchade tyvärr inget i din kundlista." 
              : "Börja med att lägga till din första kund manuellt eller låt systemet skapa dem automatiskt vid signering."}
          </p>
          {!searchQuery && (
            <Button 
              className="mt-8 h-12 px-6 rounded-xl bg-primary text-white"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus size={20} className="mr-2" />
              Skapa din första kund
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
