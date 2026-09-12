import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export default function ExpenseChart() {
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

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap: Record<string, { expenses: number; approved: number }> = {};
    months.forEach((m) => (monthMap[m] = { expenses: 0, approved: 0 }));

    expenses.forEach((exp) => {
      const date = new Date(exp.expense_date);
      const monthKey = months[date.getMonth()];
      if (monthKey) {
        monthMap[monthKey].expenses += Number(exp.amount);
        if (exp.status === "approved") {
          monthMap[monthKey].approved += Number(exp.amount);
        }
      }
    });

    return months.map((month) => ({
      month,
      expenses: Math.round(monthMap[month].expenses),
      approved: Math.round(monthMap[month].approved),
    }));
  }, [expenses]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    expenses.forEach((exp) => {
      catMap[exp.category] = (catMap[exp.category] || 0) + Number(exp.amount);
    });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    const colors = ["hsl(222, 47%, 14%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)"];
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({
        name,
        value: Math.round((value / total) * 100),
        color: colors[i % colors.length],
      }));
  }, [expenses]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="lg:col-span-2 glass-card rounded-xl p-6"
      >
        <h3 className="font-display font-semibold text-foreground mb-1">Monthly Overview</h3>
        <p className="text-sm text-muted-foreground mb-6">Submitted vs. approved expenses</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "12px",
                boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
            />
            <Legend />
            <Bar dataKey="expenses" name="Submitted" fill="hsl(222, 47%, 14%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="approved" name="Approved" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-display font-semibold text-foreground mb-1">By Category</h3>
        <p className="text-sm text-muted-foreground mb-6">Expense distribution</p>
        {categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No expenses yet</p>
        ) : (
          <div className="space-y-4">
            {categoryData.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-sm font-semibold text-foreground">{cat.value}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.value}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
