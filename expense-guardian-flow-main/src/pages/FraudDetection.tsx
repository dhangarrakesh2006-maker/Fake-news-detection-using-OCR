import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldAlert, ShieldCheck, ScanSearch, AlertTriangle,
  CheckCircle2, XCircle, Eye, Loader2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FraudAlert = {
  id: string;
  expense_id: string;
  risk_score: number;
  risk_level: string;
  flags: string[];
  ai_summary: string;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
  expenses: {
    title: string;
    merchant: string;
    amount: number;
    currency: string;
    category: string;
    expense_date: string;
    status: string;
  } | null;
};

const riskColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-yellow-950",
  low: "bg-muted text-muted-foreground",
};

const riskIcons: Record<string, React.ReactNode> = {
  critical: <XCircle className="w-4 h-4" />,
  high: <AlertTriangle className="w-4 h-4" />,
  medium: <Eye className="w-4 h-4" />,
  low: <ShieldCheck className="w-4 h-4" />,
};

export default function FraudDetection() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes("admin") || roles.includes("ceo");

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["fraud-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fraud_alerts")
        .select("*, expenses(title, merchant, amount, currency, category, expense_date, status)")
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FraudAlert[];
    },
    enabled: isAdmin,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("detect-fraud");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fraud-alerts"] });
      const count = data?.alerts?.length || 0;
      if (count > 0) {
        toast.warning(`Found ${count} suspicious expense(s)`, { description: data.overall_summary });
      } else {
        toast.success("No fraud detected", { description: data.overall_summary || "All expenses look clean." });
      }
    },
    onError: (err: any) => {
      toast.error("Fraud scan failed", { description: err.message });
    },
  });

  const markReviewed = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("fraud_alerts")
        .update({ reviewed: true, reviewed_at: new Date().toISOString() } as any)
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fraud-alerts"] });
      toast.success("Alert marked as reviewed");
    },
  });

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center h-full">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-semibold">Admin Access Required</h2>
              <p className="text-muted-foreground mt-2">Only administrators can access the fraud detection panel.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const unreviewedAlerts = alerts.filter(a => !a.reviewed);
  const reviewedAlerts = alerts.filter(a => a.reviewed);
  const criticalCount = unreviewedAlerts.filter(a => a.risk_level === "critical" || a.risk_level === "high").length;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-destructive" />
              AI Fraud Detection
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered analysis of expense patterns to detect anomalies and potential fraud
            </p>
          </div>
          <Button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            size="lg"
            className="gap-2"
          >
            {scanMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanSearch className="w-4 h-4" />
            )}
            {scanMutation.isPending ? "Scanning..." : "Run AI Scan"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreviewedAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Open Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <XCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{criticalCount}</p>
                  <p className="text-xs text-muted-foreground">High/Critical Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reviewedAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Reviewed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ScanSearch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                  <p className="text-xs text-muted-foreground">Total Scanned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        {alertsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ScanSearch className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No fraud alerts yet</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Click "Run AI Scan" to analyze recent expenses for suspicious patterns and anomalies.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {unreviewedAlerts.length > 0 ? "Active Alerts" : "All Alerts Reviewed"}
            </h2>
            {unreviewedAlerts.map((alert) => (
              <FraudAlertCard
                key={alert.id}
                alert={alert}
                onMarkReviewed={() => markReviewed.mutate(alert.id)}
                isMarking={markReviewed.isPending}
              />
            ))}

            {reviewedAlerts.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-foreground mt-8 pt-4 border-t">
                  Reviewed Alerts ({reviewedAlerts.length})
                </h2>
                {reviewedAlerts.map((alert) => (
                  <FraudAlertCard key={alert.id} alert={alert} reviewed />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function FraudAlertCard({
  alert,
  onMarkReviewed,
  isMarking,
  reviewed,
}: {
  alert: FraudAlert;
  onMarkReviewed?: () => void;
  isMarking?: boolean;
  reviewed?: boolean;
}) {
  const expense = alert.expenses;

  return (
    <Card className={cn("transition-all", reviewed && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn("p-2 rounded-lg mt-0.5", riskColors[alert.risk_level])}>
              {riskIcons[alert.risk_level]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">
                  {expense?.title || "Unknown Expense"}
                </h3>
                <Badge variant="outline" className={cn("text-xs", riskColors[alert.risk_level])}>
                  {alert.risk_level.toUpperCase()} — Score: {alert.risk_score}
                </Badge>
                {reviewed && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Reviewed
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {expense?.merchant} · {expense?.currency} {expense?.amount?.toLocaleString()} · {expense?.category} · {expense?.expense_date}
              </p>
              <p className="text-sm mt-2 text-foreground/80">{alert.ai_summary}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(alert.flags as string[]).map((flag, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {!reviewed && onMarkReviewed && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkReviewed}
              disabled={isMarking}
              className="shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark Reviewed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
