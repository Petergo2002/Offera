import type { CustomerValuePeriod } from "@workspace/api-zod";

import { formatCurrency } from "@/lib/document";

export type CustomerValueLike = {
  value?: number | null;
  valuePeriod?: CustomerValuePeriod | null;
  bindingMonths?: number | null;
  taxRate?: number | null;
};

export function hasCustomerValue(customer: CustomerValueLike) {
  return typeof customer.value === "number" && Number.isFinite(customer.value) && Boolean(customer.valuePeriod);
}

export function getCustomerMonthlyValue(customer: CustomerValueLike) {
  if (!hasCustomerValue(customer)) {
    return 0;
  }

  return customer.valuePeriod === "year" ? customer.value! / 12 : customer.value!;
}

export function getCustomerAnnualValue(customer: CustomerValueLike) {
  if (!hasCustomerValue(customer)) {
    return 0;
  }

  return customer.valuePeriod === "month" ? customer.value! * 12 : customer.value!;
}

export function formatCustomerValue(value?: number | null, valuePeriod?: CustomerValuePeriod | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || !valuePeriod) {
    return "Ej satt";
  }

  return `${formatCurrency(value)} / ${valuePeriod === "month" ? "mån" : "år"}`;
}

export function hasCustomerBinding(customer: CustomerValueLike) {
  return typeof customer.bindingMonths === "number" && Number.isInteger(customer.bindingMonths) && customer.bindingMonths > 0;
}

export function formatCustomerBinding(bindingMonths?: number | null) {
  if (typeof bindingMonths !== "number" || !Number.isInteger(bindingMonths) || bindingMonths <= 0) {
    return "Löpande";
  }

  return `${bindingMonths} mån`;
}

export function getCustomerCommittedValue(customer: CustomerValueLike) {
  if (!hasCustomerValue(customer) || !hasCustomerBinding(customer)) {
    return 0;
  }

  return getCustomerMonthlyValue(customer) * customer.bindingMonths!;
}

export function formatCustomerTaxRate(taxRate?: number | null) {
  if (typeof taxRate !== "number" || !Number.isFinite(taxRate)) {
    return "Ej satt";
  }

  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: taxRate % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(taxRate)} %`;
}

export function applyCustomerTax(value: number, taxRate?: number | null) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (typeof taxRate !== "number" || !Number.isFinite(taxRate)) {
    return value;
  }

  return value * (1 + taxRate / 100);
}
