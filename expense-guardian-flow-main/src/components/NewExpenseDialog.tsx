import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Receipt, Loader2, ScanLine, X } from "lucide-react";
import { currencies, categories } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function NewExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setTitle("");
    setMerchant("");
    setAmount("");
    setCurrency("USD");
    setCategory("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleReceiptSelect = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG)");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setReceiptFile(selectedFile);
    setReceiptPreview(URL.createObjectURL(selectedFile));

    setScanning(true);
    try {
      const base64 = await fileToBase64(selectedFile);
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64, mimeType: selectedFile.type },
      });

      if (error) throw new Error(error.message || "Scan failed");
      if (data?.error) throw new Error(data.error);

      if (data.merchant) setMerchant(data.merchant);
      if (data.amount) setAmount(String(data.amount));
      if (data.currency) setCurrency(data.currency);
      if (data.date) setExpenseDate(data.date);
      if (data.category) {
        const matched = categories.find(c => c.toLowerCase() === data.category?.toLowerCase());
        if (matched) setCategory(matched);
      }
      if (!title && data.merchant) setTitle(`Receipt - ${data.merchant}`);
      toast.success("Receipt data extracted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!user || !profile?.company_id) {
      toast.error("You must be part of a company to submit expenses");
      return;
    }
    if (!title || !merchant || !amount || !category || !notes.trim()) {
      toast.error("Please fill in all required fields including description");
      return;
    }

    setLoading(true);
    try {
      const expenseId = crypto.randomUUID();
      const { error } = await supabase.from("expenses").insert({
        id: expenseId,
        user_id: user.id,
        company_id: profile.company_id,
        title,
        merchant,
        amount: parseFloat(amount),
        currency,
        category,
        expense_date: expenseDate,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Expense submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
      setOpen(false);

      // Fire-and-forget AI fraud scan on the new expense
      supabase.functions.invoke("auto-scan-expense", {
        body: { expense_id: expenseId },
      }).then(({ data, error }) => {
        if (error) {
          console.error("Auto-scan error:", error);
          toast.error("AI fraud scan failed", { description: error.message });
          return;
        }
        if (data?.error) {
          console.error("Auto-scan returned error:", data.error);
          toast.error("AI fraud scan failed", { description: data.error });
          return;
        }
        if (data?.flagged) {
          toast.warning(`⚠️ Fraud alert: ${data.risk_level} risk`, {
            description: data.summary,
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ["fraud-alerts"] });
        }
      }).catch((err) => {
        console.error("Auto-scan exception:", err);
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Expense
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Submit New Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Client Lunch - Q1 Review" className="bg-background border-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Merchant *</Label>
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g., Starbucks, Delta Airlines" className="bg-background border-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
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
          </div>
          {Number(amount) > 100 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
              <span className="font-medium">⚠️ Amounts over $100 require manager approval before processing.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="bg-background border-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Receipt (OCR Scan)</Label>
            {!receiptPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleReceiptSelect(f);
                }}
                className="border-2 border-dashed border-input rounded-xl p-6 text-center hover:border-accent/50 transition-colors cursor-pointer"
              >
                <ScanLine className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drop receipt image or <span className="text-accent font-medium">browse</span></p>
                <p className="text-xs text-muted-foreground mt-1">AI will auto-extract merchant, amount, date & category</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleReceiptSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={receiptPreview} alt="Receipt" className="w-full max-h-[150px] object-contain bg-muted" />
                <button
                  type="button"
                  onClick={clearReceipt}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-background/80 backdrop-blur hover:bg-background transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-foreground" />
                </button>
                {scanning && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex items-center gap-2 text-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      <span className="font-medium">Scanning receipt...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Description / Purpose *</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the business purpose of this expense (e.g., Team lunch to discuss Q2 goals)" className="bg-background border-input resize-none" rows={3} />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              {loading ? "Submitting..." : "Submit Expense"}
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
