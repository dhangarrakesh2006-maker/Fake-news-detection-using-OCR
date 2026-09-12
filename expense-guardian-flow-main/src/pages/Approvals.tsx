import AppLayout from "@/components/AppLayout";
import ApprovalPipeline from "@/components/ApprovalPipeline";
import { Shield } from "lucide-react";

export default function Approvals() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Approval Queue</h1>
            <p className="text-muted-foreground text-sm">Review and action pending expense requests</p>
          </div>
        </div>
        <ApprovalPipeline />
      </div>
    </AppLayout>
  );
}
