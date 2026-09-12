import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Settings as SettingsIcon, Building2, Globe, Users, CreditCard, Lock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currencies } from "@/lib/mock-data";
import { currentUser } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[800px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your company and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Company */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-foreground">Company Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Company Name</Label>
                <Input defaultValue={currentUser.company} className="bg-background border-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Country</Label>
                <Input defaultValue="United States" className="bg-background border-input" />
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-foreground">Currency & Localization</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Base Currency</Label>
                <Select defaultValue={currentUser.baseCurrency}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Exchange Rate Source</Label>
                <Input defaultValue="exchangerate-api.com" disabled className="bg-muted border-input" />
              </div>
            </div>
          </div>

          {/* Approval Rules */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-foreground">Approval Workflow</h2>
            </div>
            <div className="space-y-3">
              {[
                { rule: "Sequential Approval", desc: "Manager → Finance → Director", active: true },
                { rule: "60% Majority Rule", desc: "Requires 60% of approvers to pass", active: false },
                { rule: "CFO Auto-Approval", desc: "CFO expenses bypass standard flow", active: true },
              ].map((item) => (
                <div key={item.rule} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.rule}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${item.active ? "bg-accent" : "bg-muted-foreground/30"}`}>
                    <div className={`w-4 h-4 rounded-full bg-card absolute top-1 transition-all ${item.active ? "left-5" : "left-1"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-foreground">Change Password</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-input max-w-sm"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-input max-w-sm"
                  minLength={6}
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="bg-accent text-accent-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                {changingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </div>

          {/* Billing */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-foreground">Billing & Plan</h2>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/20">
              <div>
                <p className="font-semibold text-foreground">Enterprise Plan</p>
                <p className="text-sm text-muted-foreground">Unlimited users · Multi-currency · OCR scanning</p>
              </div>
              <span className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-semibold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
