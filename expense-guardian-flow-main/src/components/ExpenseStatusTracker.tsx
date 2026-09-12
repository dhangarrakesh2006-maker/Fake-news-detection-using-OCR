import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "./StatusBadge";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, Eye } from "lucide-react";

export default function ExpenseStatusTracker() {
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const groups = {
    pending: expenses.filter((e) => e.status === "pending"),
    in_review: expenses.filter((e) => e.status === "in_review"),
    approved: expenses.filter((e) => e.status === "approved"),
    rejected: expenses.filter((e) => e.status === "rejected"),
  };

  const statusMeta = {
    pending: { icon: Clock, label: "Pending", color: "text-warning" },
    in_review: { icon: Eye, label: "In Review", color: "text-info" },
    approved: { icon: CheckCircle2, label: "Approved", color: "text-success" },
    rejected: { icon: XCircle, label: "Rejected", color: "text-destructive" },
  } as const;

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <p className="text-sm text-muted-foreground">Loading status tracker...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-display font-semibold text-foreground">My Expense Status</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track your submitted expenses</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {(Object.keys(statusMeta) as Array<keyof typeof statusMeta>).map((key) => {
          const meta = statusMeta[key];
          const Icon = meta.icon;
          const total = groups[key].reduce((sum, e) => sum + Number(e.amount), 0);
          return (
            <div
              key={key}
              className="bg-card border border-border rounded-lg p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
              </div>
              <span className="text-lg font-bold text-foreground">{groups[key].length}</span>
              <span className="text-xs text-muted-foreground">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent items needing attention */}
      {(groups.pending.length > 0 || groups.in_review.length > 0) && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Awaiting Action
          </p>
          <div className="space-y-2">
            {[...groups.pending, ...groups.in_review].slice(0, 5).map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                  <p className="text-xs text-muted-foreground">{exp.merchant} · {exp.expense_date}</p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {exp.currency} {Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <StatusBadge status={exp.status as any} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
