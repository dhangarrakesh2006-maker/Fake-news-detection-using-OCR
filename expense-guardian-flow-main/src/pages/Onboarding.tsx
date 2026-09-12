import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Globe, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Country {
  name: { common: string };
  currencies?: Record<string, { name: string; symbol: string }>;
}

export default function Onboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [countries, setCountries] = useState<{ name: string; currency: string }[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // If user already has a company, redirect
  useEffect(() => {
    if (profile?.company_id) navigate("/", { replace: true });
  }, [profile?.company_id, navigate]);

  // Fetch countries from restcountries.com
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,currencies")
      .then((res) => res.json())
      .then((data: Country[]) => {
        const mapped = data
          .map((c) => {
            const currencyCode = c.currencies ? Object.keys(c.currencies)[0] : "USD";
            return { name: c.name.common, currency: currencyCode };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(mapped);
      })
      .catch(() => {
        toast.error("Could not load countries. Using defaults.");
        setCountries([
          { name: "United States", currency: "USD" },
          { name: "United Kingdom", currency: "GBP" },
          { name: "Germany", currency: "EUR" },
          { name: "Japan", currency: "JPY" },
          { name: "India", currency: "INR" },
        ]);
      })
      .finally(() => setLoadingCountries(false));
  }, []);

  const handleCountryChange = (val: string) => {
    setCountry(val);
    const match = countries.find((c) => c.name === val);
    if (match) setCurrency(match.currency);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!companyName.trim() || !country) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({ name: companyName.trim(), country, base_currency: currency })
        .select("id")
        .single();

      if (companyError) throw companyError;

      // Link company to user profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Promote to admin: delete existing role then insert admin
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin" as any });

      if (roleError) throw roleError;

      toast.success("Company created! Welcome to ExpenseIQ.");
      // Force a page reload to refresh auth context
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4"
          >
            <Sparkles className="w-8 h-8 text-accent" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-foreground">Welcome to ExpenseIQ</h1>
          <p className="text-muted-foreground mt-2">Let's set up your company to get started</p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              Company Name *
            </Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              className="bg-background border-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              Country *
            </Label>
            {loadingCountries ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading countries...
              </div>
            ) : (
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select your country..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {countries.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Base Currency</Label>
            <div className="flex items-center gap-3">
              <Input
                value={currency}
                readOnly
                className="bg-muted border-input text-foreground font-semibold"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Auto-detected</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !companyName.trim() || !country}
            className="w-full bg-accent text-accent-foreground py-3 rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              <>Create Company <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
