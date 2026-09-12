import { Receipt, Clock, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function StatCards() {
  const { data: expenses = [] } = useQuery({
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

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingCount = expenses.filter((e) => e.status === "pending" || e.status === "in_review").length;
  const approvedCount = expenses.filter((e) => e.status === "approved").length;
  const rejectedCount = expenses.filter((e) => e.status === "rejected").length;

  const stats = [
    {
      label: "Total Expenses",
      value: `$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Receipt,
      change: `${expenses.length} total`,
      changeType: "neutral" as const,
    },
    {
      label: "Pending Review",
      value: pendingCount.toString(),
      icon: Clock,
      change: "Awaiting approval",
      changeType: "neutral" as const,
    },
    {
      label: "Approved",
      value: approvedCount.toString(),
      icon: CheckCircle,
      change: `${expenses.length > 0 ? Math.round((approvedCount / expenses.length) * 100) : 0}% approval rate`,
      changeType: "positive" as const,
    },
    {
      label: "Rejected",
      value: rejectedCount.toString(),
      icon: XCircle,
      change: `${expenses.length > 0 ? Math.round((rejectedCount / expenses.length) * 100) : 0}% rejection rate`,
      changeType: rejectedCount > 0 ? ("negative" as const) : ("neutral" as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="glass-card rounded-xl p-5 stat-glow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-2xl font-display font-bold text-foreground mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span
                className={cn(
                  "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                  stat.changeType === "positive" && "bg-success/10 text-success",
                  stat.changeType === "negative" && "bg-destructive/10 text-destructive",
                  stat.changeType === "neutral" && "bg-warning/10 text-warning"
                )}
              >
                {stat.change}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
