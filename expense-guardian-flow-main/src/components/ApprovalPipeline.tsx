import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, Clock, ArrowRight, MessageSquare, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ExpenseStatus } from "@/lib/mock-data";

interface StepWithName {
  id: string;
  expense_id: string;
  approver_id: string;
  step_order: number;
  role_label: string;
  status: string;
  comment: string | null;
  decided_at: string | null;
  approverName: string;
}

interface ApprovalExpense {
  id: string;
  title: string;
  merchant: string;
  amount: number;
  currency: string;
  expense_date: string;
  status: string;
  user_id: string;
  category: string;
  submitterName: string;
  myStepId: string;
  approvalChain: StepWithName[];
}

function StepIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle className="w-5 h-5 text-success" />;
  if (status === "rejected") return <XCircle className="w-5 h-5 text-destructive" />;
  if (status === "pending") return <Clock className="w-5 h-5 text-warning animate-pulse" />;
  return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
}

function ApprovalCard({
  expense,
  onAction,
}: {
  expense: ApprovalExpense;
  onAction: (stepId: string, action: "approved" | "rejected") => void;
}) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={expense.status as ExpenseStatus} />
            <span className="text-xs text-muted-foreground">by Team member</span>
          </div>
          <h3 className="font-semibold text-foreground">{expense.title}</h3>
          <p className="text-sm text-muted-foreground">
            {expense.merchant} · {expense.expense_date}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-display font-bold text-foreground">
            {expense.currency} {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {expense.category}
          </span>
        </div>
      </div>

      {/* Approval Chain */}
      <div className="flex items-center gap-2 flex-wrap">
        {expense.approvalChain.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                step.status === "approved" && "bg-success/5 border-success/20",
                step.status === "rejected" && "bg-destructive/5 border-destructive/20",
                step.status === "pending" && "bg-warning/5 border-warning/20",
                step.status === "waiting" && "bg-muted border-border"
              )}
            >
              <StepIcon status={step.status} />
              <div>
                <p className="font-medium text-foreground text-xs">{step.role_label}</p>
                <p className="text-xs text-muted-foreground">Approver</p>
              </div>
            </div>
            {i < expense.approvalChain.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Comments */}
      {expense.approvalChain.some((s) => s.comment) && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {expense.approvalChain
            .filter((s) => s.comment)
            .map((step) => (
              <div key={step.id} className="flex items-start gap-2 text-sm">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Approver:</span>{" "}
                  {step.comment}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAction(expense.myStepId, "approved")}
          className="flex-1 bg-accent text-accent-foreground text-sm font-semibold py-2.5 rounded-lg hover:bg-accent/90 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onAction(expense.myStepId, "rejected")}
          className="flex-1 bg-destructive/10 text-destructive text-sm font-semibold py-2.5 rounded-lg hover:bg-destructive/20 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export default function ApprovalPipeline() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{
    stepId: string;
    action: "approved" | "rejected";
  } | null>(null);
  const [comment, setComment] = useState("");

  const { data: pendingExpenses = [], isLoading } = useQuery({
    queryKey: ["approval-queue", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get my pending steps
      const { data: mySteps, error: stepsErr } = await supabase
        .from("approval_steps")
        .select("*")
        .eq("approver_id", user.id)
        .eq("status", "pending");

      if (stepsErr) throw stepsErr;
      if (!mySteps?.length) return [];

      const expenseIds = [...new Set(mySteps.map((s) => s.expense_id))];

      // Fetch expenses, all chain steps, and profiles in parallel
      const [expensesRes, allStepsRes, profilesRes] = await Promise.all([
        supabase.from("expenses").select("*").in("id", expenseIds),
        supabase
          .from("approval_steps")
          .select("*")
          .in("expense_id", expenseIds)
          .order("step_order"),
        supabase.from("profiles").select("user_id, full_name, email"),
      ]);

      if (expensesRes.error) throw expensesRes.error;

      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach((p) =>
        profileMap.set(p.user_id, p.full_name || p.email)
      );

      return (expensesRes.data || []).map((expense) => ({
        ...expense,
        submitterName: profileMap.get(expense.user_id) || "Unknown",
        myStepId: mySteps.find((s) => s.expense_id === expense.id)!.id,
        approvalChain: (allStepsRes.data || [])
          .filter((s) => s.expense_id === expense.id)
          .map((s) => ({
            ...s,
            approverName: profileMap.get(s.approver_id) || "Unknown",
          })),
      })) as ApprovalExpense[];
    },
    enabled: !!user,
  });

  const processDecision = useMutation({
    mutationFn: async ({
      stepId,
      decision,
      comment,
    }: {
      stepId: string;
      decision: string;
      comment?: string;
    }) => {
      const { error } = await (supabase.rpc as any)(
        "process_approval_decision",
        {
          _step_id: stepId,
          _decision: decision,
          _comment: comment || null,
        }
      );
      if (error) throw error;
    },
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(
        decision === "approved" ? "Expense approved!" : "Expense rejected"
      );
      setActionDialog(null);
      setComment("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process decision");
    },
  });

  const handleAction = (stepId: string, action: "approved" | "rejected") => {
    setActionDialog({ stepId, action });
    setComment("");
  };

  const submitDecision = () => {
    if (!actionDialog) return;
    processDecision.mutate({
      stepId: actionDialog.stepId,
      decision: actionDialog.action,
      comment: comment || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card rounded-xl p-5 h-32 animate-pulse bg-muted/20"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pendingExpenses.map((exp, i) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <ApprovalCard expense={exp} onAction={handleAction} />
          </motion.div>
        ))}
        {pendingExpenses.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground">
              All caught up!
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              No expenses waiting for your approval.
            </p>
          </div>
        )}
      </div>

      {/* Approve / Reject Dialog */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              {actionDialog?.action === "approved"
                ? "Approve Expense"
                : "Reject Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Add a comment (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-background border-input resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              disabled={processDecision.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitDecision}
              disabled={processDecision.isPending}
              className={cn(
                actionDialog?.action === "rejected" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {processDecision.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {actionDialog?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
