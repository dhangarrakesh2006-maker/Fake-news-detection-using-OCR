import AppLayout from "@/components/AppLayout";
import { BarChart3, TrendingUp, ShieldCheck } from "lucide-react";
import { newsScans } from "@/lib/fake-news-data";

export default function Reports() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Intelligence reports</h1>
            <p className="text-muted-foreground text-sm">Understand credibility patterns across both desks.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">{[{ label: "Average confidence", value: "85%", icon: ShieldCheck }, { label: "Stories this week", value: "42", icon: TrendingUp }, { label: "Source quality", value: "74/100", icon: BarChart3 }].map((item) => <div key={item.label} className="glass-card rounded-xl p-5"><item.icon className="w-5 h-5 text-accent" /><p className="text-sm text-muted-foreground mt-4">{item.label}</p><p className="text-2xl font-display font-bold text-foreground mt-1">{item.value}</p></div>)}</div>
        <div className="glass-card rounded-xl p-6"><h2 className="font-display font-semibold text-foreground">Verdict distribution</h2><div className="mt-6 space-y-5">{["Likely real", "Needs review", "Likely fake"].map((label) => { const count = newsScans.filter((scan) => scan.verdict === label).length; return <div key={label}><div className="flex justify-between text-sm mb-2"><span>{label}</span><span className="font-semibold">{count} stories</span></div><div className="h-3 rounded-full bg-muted"><div className={`h-full rounded-full ${label === "Likely real" ? "bg-success" : label === "Likely fake" ? "bg-destructive" : "bg-warning"}`} style={{ width: `${(count / newsScans.length) * 100}%` }} /></div></div> })}</div></div>
      </div>
    </AppLayout>
  );
}
