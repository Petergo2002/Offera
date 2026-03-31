import React from "react";
import { ProposalStatus } from "@workspace/api-zod";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: "Utkast", className: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent" },
  sent: { label: "Skickad", className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" },
  viewed: { label: "Visad", className: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" },
  accepted: { label: "Accepterad", className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" },
  declined: { label: "Avvisad", className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const config = statusMap[status] || statusMap.draft;
  return (
    <Badge variant="outline" className={`font-medium px-2.5 py-0.5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
