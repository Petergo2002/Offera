import type { CustomerValuePeriod } from "@workspace/api-zod";

import { formatCurrency } from "@/lib/document";

export type CustomerValueLike = {
  value?: number | null;
  valuePeriod?: CustomerValuePeriod | null;
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
