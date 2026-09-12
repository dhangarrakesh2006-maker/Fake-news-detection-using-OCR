import { useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeExpenses } from "@/hooks/use-realtime-expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend,
} from "recharts";
import {
  Star, TrendingUp, TrendingDown, DollarSign, Users, Receipt,
  ShieldAlert, ArrowUpRight, ArrowDownRight, BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PIE_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(222, 47%, 40%)", "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)", "hsl(0, 84%, 60%)", "hsl(190, 80%, 42%)",
  "hsl(330, 70%, 50%)", "hsl(50, 90%, 45%)",
];

export default function ExecutiveDashboard() {
  const { roles, profile } = useAuth();
  useRealtimeExpenses();
  const isCeo = roles.includes("ceo");

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

  const { data: profiles = [] } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department");
      if (error) throw error;
      return data;
    },
  });

  const { data: fraudAlerts = [] } = useQuery({
    queryKey: ["fraud-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fraud_alerts")
        .select("*")
        .eq("reviewed", false);
      if (error) throw error;
      return data;
    },
    enabled: isCeo,
  });

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.user_id, p])),
    [profiles]
  );

  // KPI calculations
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const lastMonthExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const monthChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    const totalSpend = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const avgPerExpense = expenses.length > 0 ? totalSpend / expenses.length : 0;
    const approvedTotal = expenses.filter((e) => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0);
    const pendingTotal = expenses.filter((e) => e.status === "pending" || e.status === "in_review").reduce((s, e) => s + Number(e.amount), 0);

    return { thisMonthTotal, lastMonthTotal, monthChange, totalSpend, avgPerExpense, approvedTotal, pendingTotal };
  }, [expenses]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleString("default", { month: "short" }), m: d.getMonth(), y: d.getFullYear() });
    }
    return months.map(({ month, m, y }) => {
      const monthExpenses = expenses.filter((e) => {
        const d = new Date(e.expense_date);
        return d.getMonth() === m && d.getFullYear() === y;
      });
      return {
        month,
        total: Math.round(monthExpenses.reduce((s, e) => s + Number(e.amount), 0)),
        approved: Math.round(monthExpenses.filter((e) => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0)),
        count: monthExpenses.length,
      };
    });
  }, [expenses]);

  // Department breakdown
  const departmentData = useMemo(() => {
    const deptMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const dept = profileMap[e.user_id]?.department || "Unassigned";
      deptMap[dept] = (deptMap[dept] || 0) + Number(e.amount);
    });
    return Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [expenses, profileMap]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [expenses]);

  // Top spenders
  const topSpenders = useMemo(() => {
    const spenderMap: Record<string, number> = {};
    expenses.forEach((e) => { spenderMap[e.user_id] = (spenderMap[e.user_id] || 0) + Number(e.amount); });
    return Object.entries(spenderMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, total]) => ({
        name: "Team member",
        department: profileMap[userId]?.department || "—",
        total: Math.round(total),
        count: expenses.filter((e) => e.user_id === userId).length,
      }));
  }, [expenses, profileMap]);

  if (!isCeo) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center h-full">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Star className="w-12 h-12 mx-auto text-accent mb-4" />
              <h2 className="text-lg font-semibold">CEO Access Required</h2>
              <p className="text-muted-foreground mt-2">Only the CEO can access the executive dashboard.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Star className="w-7 h-7 text-accent" />
              Executive Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Company-wide spending analytics & trends
            </p>
          </div>
          {fraudAlerts.length > 0 && (
            <Badge variant="destructive" className="gap-1.5 py-1.5 px-3">
              <ShieldAlert className="w-4 h-4" />
              {fraudAlerts.length} unreviewed fraud alert{fraudAlerts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "This Month",
              value: fmt(analytics.thisMonthTotal),
              icon: DollarSign,
              change: analytics.monthChange,
              sub: `vs ${fmt(analytics.lastMonthTotal)} last month`,
            },
            {
              label: "Total Spend (All Time)",
              value: fmt(analytics.totalSpend),
              icon: BarChart3,
              sub: `${expenses.length} expenses`,
            },
            {
              label: "Avg. Per Expense",
              value: fmt(Math.round(analytics.avgPerExpense)),
              icon: Receipt,
              sub: `Across all categories`,
            },
            {
              label: "Pending Approval",
              value: fmt(analytics.pendingTotal),
              icon: Users,
              sub: `${expenses.filter((e) => e.status === "pending" || e.status === "in_review").length} expenses waiting`,
            },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                        <p className="text-2xl font-display font-bold text-foreground mt-1">{kpi.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {kpi.change !== undefined && (
                        <span className={cn(
                          "text-xs font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
                          kpi.change >= 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                        )}>
                          {kpi.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(Math.round(kpi.change))}%
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{kpi.sub}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Spending Trend + Category Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="lg:col-span-2 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Spending Trend (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(222, 47%, 40%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(222, 47%, 40%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Area type="monotone" dataKey="total" name="Submitted" stroke="hsl(222, 47%, 40%)" fill="url(#gradTotal)" strokeWidth={2} />
                    <Area type="monotone" dataKey="approved" name="Approved" stroke="hsl(160, 84%, 39%)" fill="url(#gradApproved)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Category Split</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {categoryData.slice(0, 5).map((cat, i) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-foreground">{cat.name}</span>
                          </span>
                          <span className="font-semibold text-foreground">{fmt(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Department Breakdown + Top Spenders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Spend by Department</CardTitle>
              </CardHeader>
              <CardContent>
                {departmentData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={departmentData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="value" fill="hsl(222, 47%, 40%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Top Spenders</CardTitle>
              </CardHeader>
              <CardContent>
                {topSpenders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <div className="space-y-3">
                    {topSpenders.map((spender, i) => {
                      const maxSpend = topSpenders[0]?.total || 1;
                      const pct = (spender.total / maxSpend) * 100;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-sm font-medium text-foreground">{spender.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{spender.department}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-foreground">{fmt(spender.total)}</span>
                              <span className="text-xs text-muted-foreground ml-1.5">{spender.count} exp</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                              className="h-full rounded-full bg-accent"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
