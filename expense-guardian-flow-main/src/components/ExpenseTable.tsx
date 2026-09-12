import StatusBadge from "./StatusBadge";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function ExpenseTable({ limit }: { limit?: number }) {
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const query = supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (limit) query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-foreground">Recent Expenses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage expense submissions</p>
        </div>
        <Link to="/expenses" className="text-sm font-medium text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
          View All <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Expense</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Amount</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Category</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">No expenses yet. Submit your first one!</td></tr>
            ) : (
              expenses.map((exp, i) => (
                <motion.tr
                  key={exp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 + i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{exp.title}</p>
                      <p className="text-xs text-muted-foreground">{exp.merchant}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-foreground">
                      {exp.currency} {Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={exp.status as any} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{exp.expense_date}</span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
