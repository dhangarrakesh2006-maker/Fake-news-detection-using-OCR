import { cn } from "@/lib/utils";
import type { ExpenseStatus } from "@/lib/mock-data";

const statusConfig: Record<ExpenseStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
  in_review: { label: "In Review", className: "bg-info/10 text-info border-info/20" },
};

export default function StatusBadge({ status }: { status: ExpenseStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
      config.className
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === "pending" && "bg-warning",
        status === "approved" && "bg-success",
        status === "rejected" && "bg-destructive",
        status === "in_review" && "bg-info"
      )} />
      {config.label}
    </span>
  );
}
