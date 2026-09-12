import AppLayout from "@/components/AppLayout";
import { BookOpen, CheckCircle2, ExternalLink, Flag, Globe2 } from "lucide-react";

const sourceGroups = [
  { title: "Primary records", detail: "Official election offices, legislative records, league bulletins, and competition statistics.", score: "Highest confidence", icon: CheckCircle2 },
  { title: "Established reporting", detail: "Newsrooms with named bylines, transparent corrections, and a clear editorial process.", score: "Strong signal", icon: Globe2 },
  { title: "Unverified channels", detail: "Anonymous posts, screenshots, viral aggregators, and claims without a traceable source.", score: "Verify manually", icon: Flag },
];

export default function SourceGuide() {
  return <AppLayout><div className="p-6 lg:p-8 max-w-[1100px]"><div className="mb-8"><div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4"><BookOpen className="w-5 h-5 text-accent" /></div><h1 className="text-2xl font-display font-bold text-foreground">Source guide</h1><p className="text-muted-foreground text-sm mt-1">A practical reference for evaluating claims in politics and sport.</p></div><div className="grid gap-4">{sourceGroups.map((group) => <div key={group.title} className="glass-card rounded-xl p-5 flex gap-4"><div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><group.icon className="w-5 h-5 text-accent" /></div><div><div className="flex items-center gap-3"><h2 className="font-display font-semibold text-foreground">{group.title}</h2><span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">{group.score}</span></div><p className="text-sm text-muted-foreground mt-2 leading-relaxed">{group.detail}</p></div></div>)}</div><div className="mt-6 rounded-xl bg-primary p-6 text-primary-foreground"><h2 className="font-display font-semibold text-lg">A useful second check</h2><p className="text-sm text-primary-foreground/70 mt-2 leading-relaxed">Open the original source, check the publication date, and compare the exact claim with a primary record before sharing it.</p><button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">Verification checklist <ExternalLink className="w-4 h-4" /></button></div></div></AppLayout>;
}
