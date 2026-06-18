import React from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  AlertCircle,
  ArrowUpDown,
  CalendarRange,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/custom-confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api, type CreateCustomerRequest, type Customer } from "@/lib/api";
import {
  formatCustomerBinding,
  formatCustomerValue,
  getCustomerAnnualValue,
  getCustomerMonthlyValue,
} from "@/lib/customer-value";
import { formatCurrency } from "@/lib/document";

type CustomerSort = "updated" | "newest" | "name" | "value";

function hasContactMethod(customer: Customer) {
  return Boolean(customer.email?.trim() || customer.phone?.trim());
}

function ContactStatus({ customer }: { customer: Customer }) {
  const isContactable = hasContactMethod(customer);
  return (
    <Badge
      variant="outline"
      className={
        isContactable
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
    >
      {isContactable ? "Kontakt klar" : "Saknar kontaktväg"}
    </Badge>
  );
}

type CustomerActionsProps = {
  customer: Customer;
  isDeleting: boolean;
  onView: () => void;
  onDelete: () => void;
};

function CustomerActions({
  customer,
  isDeleting,
  onView,
  onDelete,
}: CustomerActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          aria-label={`Åtgärder för ${customer.name}`}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal size={18} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem onClick={onView} className="gap-2 rounded-lg">
          <Eye size={16} />
          Visa kund
        </DropdownMenuItem>
        {customer.email ? (
          <DropdownMenuItem asChild className="gap-2 rounded-lg">
            <a href={`mailto:${customer.email}`}>
              <Mail size={16} />
              Skicka e-post
            </a>
          </DropdownMenuItem>
        ) : null}
        {customer.phone ? (
          <DropdownMenuItem asChild className="gap-2 rounded-lg">
            <a href={`tel:${customer.phone}`}>
              <Phone size={16} />
              Ring kunden
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="gap-2 rounded-lg text-destructive focus:text-destructive"
        >
          <Trash2 size={16} />
          Ta bort kund
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CustomerListSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-white">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex items-center gap-4 border-b border-outline-variant/10 p-5 last:border-0"
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
        </div>
      ))}
    </div>
  );
}

export default function CustomersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sort, setSort] = React.useState<CustomerSort>("updated");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const {
    data: customers = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: api.listCustomers,
  });

  const createCustomerMutation = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: (customer) => {
      queryClient.setQueryData<Customer[]>(["customers"], (current = []) => [
        customer,
        ...current,
      ]);
      setIsCreateDialogOpen(false);
      toast({
        title: "Kund skapad",
        description: `${customer.name} har lagts till i CRM.`,
      });
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte skapa kunden",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: (_data, customerId) => {
      queryClient.setQueryData<Customer[]>(["customers"], (current = []) =>
        current.filter((customer) => customer.id !== customerId),
      );
      toast({ title: "Kund borttagen" });
    },
    onError: (mutationError: unknown) => {
      toast({
        title: "Kunde inte ta bort kunden",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Försök igen.",
        variant: "destructive",
      });
    },
  });

  const customerMetrics = React.useMemo(() => {
    return {
      totalMonthlyValue: customers.reduce(
        (sum, customer) => sum + getCustomerMonthlyValue(customer),
        0,
      ),
      totalAnnualValue: customers.reduce(
        (sum, customer) => sum + getCustomerAnnualValue(customer),
        0,
      ),
      contactableCount: customers.filter(hasContactMethod).length,
    };
  }, [customers]);

  const visibleCustomers = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("sv-SE");
    const filtered = query
      ? customers.filter((customer) =>
          [
            customer.name,
            customer.email,
            customer.phone,
            customer.contactPerson,
            customer.orgNumber,
            customer.city,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("sv-SE")
            .includes(query),
        )
      : [...customers];

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "sv");
      if (sort === "newest")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sort === "value")
        return getCustomerAnnualValue(b) - getCustomerAnnualValue(a);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [customers, searchQuery, sort]);

  const handleDelete = async (customer: Customer) => {
    const confirmed = await confirm({
      title: `Ta bort ${customer.name}?`,
      description:
        "Kundprofilen och sparade resurslänkar tas bort permanent. Kopplade offerter finns kvar men kopplas loss från kunden.",
      confirmLabel: "Ta bort kund",
      variant: "destructive",
    });
    if (confirmed) deleteCustomerMutation.mutate(customer.id);
  };

  const openCustomer = (customerId: string) =>
    setLocation(`/customers/${customerId}`);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            CRM
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Kunder
          </h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Samla kontaktuppgifter, avtalsvärden, offerter och kundresurser på
            ett ställe.
          </p>
        </div>
        <CustomerFormDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={(data: CreateCustomerRequest) =>
            createCustomerMutation.mutate(data)
          }
          isPending={createCustomerMutation.isPending}
          trigger={
            <Button className="h-11 shrink-0 rounded-xl px-5">
              <Plus size={18} className="mr-2" />
              Ny kund
            </Button>
          }
        />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Kunder",
            value: customers.length.toLocaleString("sv-SE"),
            icon: Users,
          },
          {
            label: "Kontaktbara",
            value: `${customerMetrics.contactableCount} av ${customers.length}`,
            icon: CheckCircle2,
          },
          {
            label: "Månadsvärde",
            value: formatCurrency(customerMetrics.totalMonthlyValue),
            icon: CalendarRange,
          },
          {
            label: "Årsvärde",
            value: formatCurrency(customerMetrics.totalAnnualValue),
            icon: Wallet,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="rounded-2xl border-outline-variant/10 bg-white shadow-subtle"
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                <Icon size={19} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface-variant">
                  {label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-24" />
                ) : (
                  <p className="truncate text-lg font-bold text-slate-900">
                    {value}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
              size={18}
            />
            <Input
              aria-label="Sök kunder"
              placeholder="Sök namn, kontakt, e-post, telefon, org.nr eller ort..."
              className="h-11 rounded-xl bg-white pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as CustomerSort)}
          >
            <SelectTrigger
              className="h-11 w-full rounded-xl bg-white md:w-[210px]"
              aria-label="Sortera kunder"
            >
              <ArrowUpDown size={16} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Senast uppdaterad</SelectItem>
              <SelectItem value="newest">Nyast först</SelectItem>
              <SelectItem value="name">Namn A–Ö</SelectItem>
              <SelectItem value="value">Högst årsvärde</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isFetching && !isLoading ? (
          <p
            className="flex items-center gap-2 text-xs text-on-surface-variant"
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uppdaterar
            kundlistan...
          </p>
        ) : null}

        {isLoading ? (
          <CustomerListSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
            <AlertCircle className="mb-4 text-destructive" size={28} />
            <h2 className="font-bold text-slate-900">
              Kundlistan kunde inte hämtas
            </h2>
            <p className="mt-2 max-w-md text-sm text-on-surface-variant">
              {error instanceof Error
                ? error.message
                : "Kontrollera anslutningen och försök igen."}
            </p>
            <Button
              variant="outline"
              className="mt-5 rounded-xl"
              onClick={() => void refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Försök igen
            </Button>
          </div>
        ) : visibleCustomers.length > 0 ? (
          <>
            <div className="hidden overflow-hidden rounded-3xl border border-outline-variant/10 bg-white shadow-subtle md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant">
                    <th className="px-6 py-4">Kund</th>
                    <th className="px-6 py-4">Kontaktstatus</th>
                    <th className="px-6 py-4">Kundvärde</th>
                    <th className="px-6 py-4">Uppdaterad</th>
                    <th className="px-6 py-4 text-right">
                      <span className="sr-only">Åtgärder</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/35"
                    >
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => openCustomer(customer.id)}
                          className="group text-left"
                        >
                          <span className="block font-bold text-slate-900 group-hover:text-primary">
                            {customer.name}
                          </span>
                          <span className="mt-1 block text-sm text-on-surface-variant">
                            {customer.contactPerson ||
                              customer.email ||
                              customer.orgNumber ||
                              "Ingen kontaktinformation"}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <ContactStatus customer={customer} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {formatCustomerValue(
                            customer.value,
                            customer.valuePeriod,
                          )}
                        </p>
                        {customer.bindingMonths ? (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {formatCustomerBinding(customer.bindingMonths)}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-on-surface-variant">
                        {format(new Date(customer.updatedAt), "d MMM yyyy", {
                          locale: sv,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <CustomerActions
                          customer={customer}
                          isDeleting={
                            deleteCustomerMutation.isPending &&
                            deleteCustomerMutation.variables === customer.id
                          }
                          onView={() => openCustomer(customer.id)}
                          onDelete={() => void handleDelete(customer)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {visibleCustomers.map((customer) => (
                <Card
                  key={customer.id}
                  className="rounded-2xl border-outline-variant/10 bg-white shadow-subtle"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => openCustomer(customer.id)}
                      >
                        <h2 className="truncate font-bold text-slate-900">
                          {customer.name}
                        </h2>
                        <p className="mt-1 truncate text-sm text-on-surface-variant">
                          {customer.contactPerson ||
                            customer.email ||
                            "Ingen kontaktinformation"}
                        </p>
                      </button>
                      <CustomerActions
                        customer={customer}
                        isDeleting={
                          deleteCustomerMutation.isPending &&
                          deleteCustomerMutation.variables === customer.id
                        }
                        onView={() => openCustomer(customer.id)}
                        onDelete={() => void handleDelete(customer)}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
                      <ContactStatus customer={customer} />
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCustomerValue(
                          customer.value,
                          customer.valuePeriod,
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-outline-variant/25 bg-white px-6 py-16 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary">
              <Users size={26} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {searchQuery
                ? "Inga kunder matchar sökningen"
                : "Skapa din första kund"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-on-surface-variant">
              {searchQuery
                ? "Prova ett annat namn, telefonnummer, organisationsnummer eller ort."
                : "Lägg till en kund manuellt. Kunder kan också skapas automatiskt när en offert accepteras."}
            </p>
            {searchQuery ? (
              <Button
                variant="outline"
                className="mt-5 rounded-xl"
                onClick={() => setSearchQuery("")}
              >
                Rensa sökning
              </Button>
            ) : (
              <Button
                className="mt-5 rounded-xl"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Skapa kund
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
