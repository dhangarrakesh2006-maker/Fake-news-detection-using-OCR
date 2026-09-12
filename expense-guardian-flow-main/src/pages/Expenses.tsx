import AppLayout from "@/components/AppLayout";
import ExpenseTable from "@/components/ExpenseTable";
import NewExpenseDialog from "@/components/NewExpenseDialog";
import StatusBadge from "@/components/StatusBadge";
import { Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Expenses() {
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

  const counts = {
    all: expenses.length,
    pending: expenses.filter(e => e.status === "pending").length,
    in_review: expenses.filter(e => e.status === "in_review").length,
    approved: expenses.filter(e => e.status === "approved").length,
    rejected: expenses.filter(e => e.status === "rejected").length,
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all expense submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-input bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-input bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <NewExpenseDialog />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(["all", "pending", "in_review", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-card border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
            >
              {s === "all" ? "All" : <StatusBadge status={s} />}
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-semibold">
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        <ExpenseTable />
      </div>
    </AppLayout>
  );
}
