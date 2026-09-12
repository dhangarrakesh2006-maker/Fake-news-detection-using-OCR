import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Camera, Upload, Sparkles, Loader2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ExtractedData {
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
}

const CATEGORIES = ["meals", "travel", "supplies", "software", "equipment", "other"];

export default function ScanReceipt() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

  // Editable fields after extraction
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("other");

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG)");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setExtracted(null);

    // Convert to base64 and scan
    setScanning(true);
    try {
      const base64 = await fileToBase64(selectedFile);
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64, mimeType: selectedFile.type },
      });

      if (error) throw new Error(error.message || "Scan failed");
      if (data?.error) throw new Error(data.error);

      setExtracted(data);
      setMerchant(data.merchant || "");
      setAmount(String(data.amount || ""));
      setCurrency(data.currency || "USD");
      setDate(data.date || "");
      setCategory(data.category || "other");
      toast.success("Receipt data extracted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data:...;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleSubmitExpense = async () => {
    if (!user || !profile?.company_id) {
      toast.error("Please complete onboarding first");
      return;
    }
    if (!merchant || !amount || !date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Upload receipt image to storage
      let receiptUrl: string | null = null;
      if (file) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("receipts")
            .getPublicUrl(filePath);
          receiptUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        company_id: profile.company_id,
        title: `Receipt - ${merchant}`,
        merchant,
        amount: parseFloat(amount),
        currency,
        expense_date: date,
        category,
        receipt_url: receiptUrl,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Expense created from receipt!");
      navigate("/expenses");
    } catch (err: any) {
      toast.error(err.message || "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  const resetScan = () => {
    setFile(null);
    setPreview(null);
    setExtracted(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[700px] mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Scan Receipt</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Upload a receipt image and AI will auto-extract merchant name, amount, date, and category.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass-card rounded-2xl p-8 space-y-6"
        >
          {/* Upload area */}
          {!preview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-input rounded-xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer group"
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4 group-hover:text-accent transition-colors" />
              <p className="text-foreground font-medium">Drop receipt image here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="text-accent font-medium">browse files</span>
              </p>
              <p className="text-xs text-muted-foreground mt-3">Supports JPG, PNG · Max 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={preview} alt="Receipt" className="w-full max-h-[300px] object-contain bg-muted" />
                <button
                  onClick={resetScan}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
                <AnimatePresence>
                  {scanning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center"
                    >
                      <div className="flex items-center gap-3 text-foreground">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        <span className="font-medium">Analyzing receipt...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Extracted data info */}
          {!extracted && !scanning && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">AI will extract:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Merchant Name", "Amount & Currency", "Transaction Date", "Expense Category"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable extracted fields */}
          <AnimatePresence>
            {extracted && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <Check className="w-4 h-4" />
                  Data extracted — review and submit
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-sm text-foreground">Merchant *</Label>
                    <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} className="bg-background border-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-foreground">Amount *</Label>
                    <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-background border-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-foreground">Currency</Label>
                    <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-background border-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-foreground">Date *</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background border-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-foreground">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <button
                  onClick={handleSubmitExpense}
                  disabled={submitting || !merchant || !amount || !date}
                  className="w-full bg-accent text-accent-foreground py-3 rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    "Create Expense from Receipt"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppLayout>
  );
}
