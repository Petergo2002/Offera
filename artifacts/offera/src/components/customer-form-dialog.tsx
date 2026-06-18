import React from "react";
import {
  CreateCustomerBody,
  type CreateCustomerRequest,
  type Customer,
} from "@workspace/api-zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CustomerFormState = {
  name: string;
  email: string;
  orgNumber: string;
  contactPerson: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  value: string;
  valuePeriod: "month" | "year" | "";
  bindingMonths: string;
  taxRate: string;
};

type CustomerFormField = keyof CustomerFormState;
type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: "",
  email: "",
  orgNumber: "",
  contactPerson: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  value: "",
  valuePeriod: "",
  bindingMonths: "",
  taxRate: "",
};

function toCustomerFormState(customer?: Customer): CustomerFormState {
  if (!customer) return EMPTY_CUSTOMER_FORM;

  return {
    name: customer.name,
    email: customer.email ?? "",
    orgNumber: customer.orgNumber ?? "",
    contactPerson: customer.contactPerson ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    postalCode: customer.postalCode ?? "",
    city: customer.city ?? "",
    value: typeof customer.value === "number" ? String(customer.value) : "",
    valuePeriod: customer.valuePeriod ?? "",
    bindingMonths:
      typeof customer.bindingMonths === "number"
        ? String(customer.bindingMonths)
        : "",
    taxRate:
      typeof customer.taxRate === "number" ? String(customer.taxRate) : "",
  };
}

function validateCustomerForm(
  form: CustomerFormState,
):
  | { success: true; data: CreateCustomerRequest }
  | { success: false; errors: CustomerFormErrors } {
  const result = CreateCustomerBody.safeParse({
    name: form.name,
    email: form.email.trim() || null,
    orgNumber: form.orgNumber.trim() || null,
    contactPerson: form.contactPerson.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    postalCode: form.postalCode.trim() || null,
    city: form.city.trim() || null,
    value: form.value.trim() || null,
    valuePeriod: form.valuePeriod || null,
    bindingMonths: form.bindingMonths.trim() || null,
    taxRate: form.taxRate.trim() || null,
  });

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: CustomerFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      field in form &&
      !errors[field as CustomerFormField]
    ) {
      errors[field as CustomerFormField] = issue.message;
    }
  }

  return { success: false, errors };
}

type CustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCustomerRequest) => void;
  isPending: boolean;
  customer?: Customer;
  trigger: React.ReactNode;
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  customer,
  trigger,
}: CustomerFormDialogProps) {
  const [form, setForm] = React.useState<CustomerFormState>(() =>
    toCustomerFormState(customer),
  );
  const [errors, setErrors] = React.useState<CustomerFormErrors>({});
  const isEditing = Boolean(customer);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm(toCustomerFormState(customer));
      setErrors({});
    }
    onOpenChange(nextOpen);
  };

  const updateField = (field: CustomerFormField, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "value" && value.trim() === "") {
        next.valuePeriod = "";
        next.bindingMonths = "";
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateCustomerForm(form);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  const fieldProps = (field: CustomerFormField) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  const fieldError = (field: CustomerFormField) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-xs font-medium text-destructive">
        {errors[field]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-[760px]">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader className="border-b border-outline-variant/10 px-6 py-6 text-left sm:px-8">
            <DialogTitle className="text-2xl font-display font-bold">
              {isEditing ? "Redigera kund" : "Skapa ny kund"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Uppdatera kontakt-, adress- och avtalsuppgifter."
                : "Företagsnamn är obligatoriskt. Övriga uppgifter kan kompletteras senare."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 px-6 py-6 sm:px-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Företag och kontakt
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Uppgifter som används när du skapar och skickar offerter.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="customer-name">Företagsnamn</Label>
                  <Input
                    id="customer-name"
                    autoFocus
                    autoComplete="organization"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Exempelbolaget AB"
                    className="h-11 rounded-xl"
                    {...fieldProps("name")}
                  />
                  {fieldError("name")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-org-number">
                    Organisationsnummer
                  </Label>
                  <Input
                    id="customer-org-number"
                    value={form.orgNumber}
                    onChange={(event) =>
                      updateField("orgNumber", event.target.value)
                    }
                    placeholder="556677-8899"
                    className="h-11 rounded-xl"
                    {...fieldProps("orgNumber")}
                  />
                  {fieldError("orgNumber")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-contact">Kontaktperson</Label>
                  <Input
                    id="customer-contact"
                    autoComplete="name"
                    value={form.contactPerson}
                    onChange={(event) =>
                      updateField("contactPerson", event.target.value)
                    }
                    placeholder="För- och efternamn"
                    className="h-11 rounded-xl"
                    {...fieldProps("contactPerson")}
                  />
                  {fieldError("contactPerson")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-email">E-post</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="namn@foretag.se"
                    className="h-11 rounded-xl"
                    {...fieldProps("email")}
                  />
                  {fieldError("email")}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="customer-phone">Telefon</Label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder="070-123 45 67"
                    className="h-11 rounded-xl"
                    {...fieldProps("phone")}
                  />
                  {fieldError("phone")}
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-outline-variant/10 pt-7">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adress</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Valfritt, men praktiskt för avtalsunderlag.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="customer-address">Gatuadress</Label>
                  <Input
                    id="customer-address"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="Gatunamn 12"
                    className="h-11 rounded-xl"
                    {...fieldProps("address")}
                  />
                  {fieldError("address")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-postal-code">Postnummer</Label>
                  <Input
                    id="customer-postal-code"
                    autoComplete="postal-code"
                    value={form.postalCode}
                    onChange={(event) =>
                      updateField("postalCode", event.target.value)
                    }
                    placeholder="123 45"
                    className="h-11 rounded-xl"
                    {...fieldProps("postalCode")}
                  />
                  {fieldError("postalCode")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-city">Ort</Label>
                  <Input
                    id="customer-city"
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="Stockholm"
                    className="h-11 rounded-xl"
                    {...fieldProps("city")}
                  />
                  {fieldError("city")}
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-outline-variant/10 pt-7">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Avtalsvärde
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Valfritt. Värdet används i CRM-översikten och påverkar inte
                  befintliga offerter.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="customer-value">Kundvärde</Label>
                  <Input
                    id="customer-value"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.value}
                    onChange={(event) =>
                      updateField("value", event.target.value)
                    }
                    placeholder="12 500"
                    className="h-11 rounded-xl"
                    {...fieldProps("value")}
                  />
                  {fieldError("value")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-value-period">Period</Label>
                  <Select
                    value={form.valuePeriod || undefined}
                    onValueChange={(value) => updateField("valuePeriod", value)}
                    disabled={!form.value.trim()}
                  >
                    <SelectTrigger
                      id="customer-value-period"
                      className="h-11 rounded-xl"
                      {...fieldProps("valuePeriod")}
                    >
                      <SelectValue placeholder="Välj period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Per månad</SelectItem>
                      <SelectItem value="year">Per år</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldError("valuePeriod")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-binding">Bindningstid</Label>
                  <Input
                    id="customer-binding"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    disabled={!form.value.trim()}
                    value={form.bindingMonths}
                    onChange={(event) =>
                      updateField("bindingMonths", event.target.value)
                    }
                    placeholder="Månader"
                    className="h-11 rounded-xl"
                    {...fieldProps("bindingMonths")}
                  />
                  {fieldError("bindingMonths")}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-tax">Moms (%)</Label>
                  <Input
                    id="customer-tax"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    value={form.taxRate}
                    onChange={(event) =>
                      updateField("taxRate", event.target.value)
                    }
                    placeholder="25"
                    className="h-11 rounded-xl"
                    {...fieldProps("taxRate")}
                  />
                  {fieldError("taxRate")}
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-outline-variant/10 bg-white/95 px-6 py-4 backdrop-blur sm:px-8">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl px-6"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isPending
                ? "Sparar..."
                : isEditing
                  ? "Spara ändringar"
                  : "Skapa kund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
