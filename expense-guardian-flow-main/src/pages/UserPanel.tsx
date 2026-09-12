import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  ArrowUpRight, BarChart3, Bookmark, CheckCircle2, FileSearch, Globe2,
  History, Image, Languages, Lightbulb, LockKeyhole, Pencil, Save,
  ShieldCheck, Sparkles, XCircle, CircleAlert,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { newsScans } from "@/lib/fake-news-data";

type Language = "English" | "हिन्दी" | "मराठी";

const copy: Record<Language, { eyebrow: string; title: string; intro: string; profile: string; records: string; language: string; insights: string; guide: string; save: string; saved: string; edit: string; saveChanges: string; recent: string }> = {
  English: { eyebrow: "Personal workspace", title: "Your verification center", intro: "Manage your profile, review your records, and learn what the signals are telling you.", profile: "My profile", records: "Saved records", language: "Language preference", insights: "Your scan insights", guide: "Verification guide", save: "Save record", saved: "Saved", edit: "Edit profile", saveChanges: "Save changes", recent: "Recent records" },
  "हिन्दी": { eyebrow: "व्यक्तिगत कार्यक्षेत्र", title: "आपका सत्यापन केंद्र", intro: "अपनी प्रोफ़ाइल संभालें, रिकॉर्ड देखें और संकेतों को समझें।", profile: "मेरी प्रोफ़ाइल", records: "सहेजे रिकॉर्ड", language: "भाषा पसंद", insights: "आपके स्कैन के आंकड़े", guide: "सत्यापन मार्गदर्शिका", save: "रिकॉर्ड सहेजें", saved: "सहेजा गया", edit: "प्रोफ़ाइल बदलें", saveChanges: "बदलाव सहेजें", recent: "हाल के रिकॉर्ड" },
  "मराठी": { eyebrow: "वैयक्तिक कार्यक्षेत्र", title: "तुमचे पडताळणी केंद्र", intro: "तुमचे प्रोफाइल सांभाळा, रेकॉर्ड तपासा आणि संकेत समजून घ्या.", profile: "माझे प्रोफाइल", records: "साठवलेले रेकॉर्ड", language: "भाषेची निवड", insights: "तुमच्या स्कॅनचे आकडे", guide: "पडताळणी मार्गदर्शक", save: "रेकॉर्ड साठवा", saved: "साठवले", edit: "प्रोफाइल बदला", saveChanges: "बदल जतन करा", recent: "अलीकडील रेकॉर्ड" },
};

const verdictColors = ["hsl(160 84% 39%)", "hsl(38 92% 50%)", "hsl(0 72% 51%)"];

export default function UserPanel() {
  const [language, setLanguage] = useState<Language>("English");
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState("Employee");
  const [savedIds, setSavedIds] = useState<string[]>(["scan-001", "scan-003"]);
  const t = copy[language];

  const verdictData = useMemo(() => [
    { name: "Likely real", value: newsScans.filter((scan) => scan.verdict === "Likely real").length },
    { name: "Needs review", value: newsScans.filter((scan) => scan.verdict === "Needs review").length },
    { name: "Likely fake", value: newsScans.filter((scan) => scan.verdict === "Likely fake").length },
  ], []);
  const confidenceData = [
    { range: "0-40", stories: newsScans.filter((scan) => scan.confidence <= 40).length },
    { range: "41-60", stories: newsScans.filter((scan) => scan.confidence > 40 && scan.confidence <= 60).length },
    { range: "61-80", stories: newsScans.filter((scan) => scan.confidence > 60 && scan.confidence <= 80).length },
    { range: "81-100", stories: newsScans.filter((scan) => scan.confidence > 80).length },
  ];
  const averageConfidence = Math.round(newsScans.reduce((total, scan) => total + scan.confidence, 0) / newsScans.length);
  const savedRecords = newsScans.filter((scan) => savedIds.includes(scan.id));

  return <AppLayout>
    <div className="p-5 sm:p-6 lg:p-8 max-w-[1400px]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div><p className="text-xs uppercase tracking-[0.18em] text-accent font-semibold">{t.eyebrow}</p><h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-2">{t.title}</h1><p className="text-muted-foreground mt-2 max-w-2xl">{t.intro}</p></div>
        <Link to="/analyze" className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-semibold"><Sparkles className="w-4 h-4" /> New analysis</Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr_0.9fr] gap-5">
        <section className="glass-card rounded-xl p-5 sm:p-6 xl:col-span-1">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold">U</div><div><h2 className="font-display font-semibold">{t.profile}</h2><p className="text-xs text-muted-foreground">Your private verification workspace</p></div></div><button onClick={() => setEditing(!editing)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted" title={t.edit}><Pencil className="w-4 h-4" /></button></div>
          {editing ? <div className="space-y-3 mt-6"><input value={role} onChange={(event) => setRole(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Role" /><button onClick={() => setEditing(false)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold"><Save className="w-4 h-4" />{t.saveChanges}</button></div> : <div className="mt-6 space-y-3"><div><p className="text-xs text-muted-foreground">Role</p><p className="text-sm font-medium mt-1">{role}</p></div><div className="flex items-center gap-2 pt-2 text-xs text-accent"><LockKeyhole className="w-3.5 h-3.5" /> Private workspace</div></div>}
        </section>

        <section className="glass-card rounded-xl p-5 sm:p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Languages className="w-5 h-5 text-info" /></div><div><h2 className="font-display font-semibold">{t.language}</h2><p className="text-xs text-muted-foreground">Use the language that feels clearest</p></div></div><div className="grid grid-cols-3 gap-2 mt-6">{(["English", "हिन्दी", "मराठी"] as Language[]).map((option) => <button key={option} onClick={() => setLanguage(option)} className={`rounded-lg border px-2 py-3 text-sm font-semibold transition-colors ${language === option ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-muted"}`}>{option}</button>)}</div><div className="mt-5 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">{language === "English" ? "Analysis signals and guidance will appear in English." : language === "हिन्दी" ? "विश्लेषण संकेत और मार्गदर्शन हिन्दी में दिखाई देंगे।" : "विश्लेषण संकेत आणि मार्गदर्शन मराठीत दिसेल."}</div></section>

        <section className="rounded-xl bg-primary text-primary-foreground p-5 sm:p-6"><div className="flex items-center gap-2 text-accent"><ShieldCheck className="w-5 h-5" /><span className="text-xs uppercase tracking-[0.16em] font-semibold">Trust snapshot</span></div><p className="text-4xl font-display font-bold mt-5">{averageConfidence}%</p><p className="text-sm text-primary-foreground/70 mt-1">Average confidence across {newsScans.length} checked stories</p><div className="h-2 rounded-full bg-primary-foreground/15 mt-6 overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${averageConfidence}%` }} /></div><Link to="/sources" className="inline-flex items-center gap-1 text-sm text-accent font-semibold mt-5">Read source guide <ArrowUpRight className="w-4 h-4" /></Link></section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <section className="glass-card rounded-xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display font-semibold">{t.insights}</h2><p className="text-sm text-muted-foreground mt-1">A quick view of how your checks are distributed.</p></div><BarChart3 className="w-5 h-5 text-accent" /></div><div className="h-56 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={verdictData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={4}>{verdictData.map((entry, index) => <Cell key={entry.name} fill={verdictColors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">{verdictData.map((entry, index) => <span key={entry.name} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: verdictColors[index] }} />{entry.name} ({entry.value})</span>)}</div></section>
        <section className="glass-card rounded-xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display font-semibold">Confidence histogram</h2><p className="text-sm text-muted-foreground mt-1">Where your evidence strength usually lands.</p></div><BarChart3 className="w-5 h-5 text-info" /></div><div className="h-64 mt-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={confidenceData} barCategoryGap="28%"><CartesianGrid vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} /><Tooltip cursor={{ fill: "hsl(var(--muted))" }} /><Bar dataKey="stories" name="Stories" fill="hsl(var(--info))" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5 mt-5">
        <section className="glass-card rounded-xl overflow-hidden"><div className="px-5 sm:px-6 py-5 border-b border-border flex items-center justify-between"><div><h2 className="font-display font-semibold">{t.records}</h2><p className="text-sm text-muted-foreground mt-1">Keep important checks close for a second look.</p></div><Bookmark className="w-5 h-5 text-accent" /></div><div className="divide-y divide-border">{savedRecords.map((scan) => <div key={scan.id} className="px-5 sm:px-6 py-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><FileSearch className="w-4 h-4 text-accent" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{scan.headline}</p><p className="text-xs text-muted-foreground mt-1">{scan.source} · {scan.scannedAt}</p></div><button onClick={() => setSavedIds((current) => current.filter((id) => id !== scan.id))} className="text-xs text-accent font-semibold">{t.saved}</button></div>)}</div><Link to="/history" className="flex items-center justify-center gap-1 px-5 py-4 text-sm text-accent font-semibold border-t border-border">{t.recent} <ArrowUpRight className="w-4 h-4" /></Link></section>
        <section className="glass-card rounded-xl p-5 sm:p-6"><div className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-warning" /><h2 className="font-display font-semibold">{t.guide}</h2></div><div className="space-y-4 mt-5">{[{ icon: CheckCircle2, title: "High confidence", text: "Still open the original source before sharing." }, { icon: CircleAlert, title: "Needs review", text: "Compare dates, names, and at least one primary record." }, { icon: XCircle, title: "Low confidence", text: "Pause before reposting and look for independent coverage." }].map((item) => <div key={item.title} className="flex gap-3"><item.icon className="w-4 h-4 text-accent mt-0.5 shrink-0" /><div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.text}</p></div></div>)}</div><div className="grid grid-cols-3 gap-2 mt-6"><Link to="/analyze" className="rounded-lg bg-muted p-3 text-center text-xs font-semibold hover:bg-accent/10"><Image className="w-4 h-4 mx-auto mb-1 text-accent" />Scan image</Link><Link to="/history" className="rounded-lg bg-muted p-3 text-center text-xs font-semibold hover:bg-accent/10"><History className="w-4 h-4 mx-auto mb-1 text-accent" />Records</Link><Link to="/sources" className="rounded-lg bg-muted p-3 text-center text-xs font-semibold hover:bg-accent/10"><Globe2 className="w-4 h-4 mx-auto mb-1 text-accent" />Sources</Link></div></section>
      </div>
    </div>
  </AppLayout>;
}

/*
export default function UserPanel() {
  const { profile } = useAuth();
  return <AppLayout><div className="p-6 lg:p-8 max-w-[1200px]"><div className="mb-8"><p className="text-xs uppercase tracking-[0.18em] text-accent font-semibold">User workspace</p><h1 className="text-3xl font-display font-bold text-foreground mt-2">Your verification panel</h1><p className="text-muted-foreground mt-1">Welcome, {profile?.full_name || "Reader"}. Submit text or images and review your results.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Link to="/analyze" className="glass-card rounded-xl p-5 hover:border-accent transition-colors"><Plus className="w-5 h-5 text-accent" /><h2 className="font-display font-semibold mt-5">New analysis</h2><p className="text-sm text-muted-foreground mt-2">Analyze OCR text or upload a news image.</p></Link><Link to="/history" className="glass-card rounded-xl p-5 hover:border-accent transition-colors"><History className="w-5 h-5 text-accent" /><h2 className="font-display font-semibold mt-5">My history</h2><p className="text-sm text-muted-foreground mt-2">Review previous fake-news verification outputs.</p></Link><div className="glass-card rounded-xl p-5"><ShieldCheck className="w-5 h-5 text-accent" /><h2 className="font-display font-semibold mt-5">Private local mode</h2><p className="text-sm text-muted-foreground mt-2">Your image and text are processed locally in this demo.</p></div></div><div className="glass-card rounded-xl p-6 mt-6"><h2 className="font-display font-semibold text-foreground">Supported input</h2><div className="grid md:grid-cols-3 gap-4 mt-5"><div className="flex gap-3"><Image className="w-5 h-5 text-accent" /><span className="text-sm">News screenshots with OCR</span></div><div className="flex gap-3"><FileSearch className="w-5 h-5 text-accent" /><span className="text-sm">Copied article text</span></div><div className="flex gap-3"><Languages className="w-5 h-5 text-accent" /><span className="text-sm">Marathi, Hindi, English</span></div></div></div></div></AppLayout>;
}
*/
