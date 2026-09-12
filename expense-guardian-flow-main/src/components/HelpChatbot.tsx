import { useState } from "react";
import { Bot, CheckCircle2, MessageCircle, Send, X } from "lucide-react";

const quickReplies = [
  { label: "How do I verify a story?", answer: "Open the original source, check the date and named author, then compare the claim with a primary record." },
  { label: "What does confidence mean?", answer: "Confidence is the strength of the signals found in the scan. A high score is helpful, but you should still check the source before sharing." },
  { label: "Where are my records?", answer: "Use Scan history in the sidebar, or open the Saved records section in your User panel." },
];

export default function HelpChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([
    { from: "bot", text: "Hi! I can help you understand a scan or find a feature." },
  ]);

  const reply = (question: string, answer: string) => {
    setMessages((current) => [...current, { from: "user", text: question }, { from: "bot", text: answer }]);
  };

  return <>
    {open && <div className="fixed right-4 bottom-24 z-[60] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent"><Bot className="h-4 w-4 text-accent-foreground" /></div><div><p className="text-sm font-semibold">Verity assistant</p><p className="text-[11px] text-primary-foreground/65">Here when you need a second check</p></div></div><button onClick={() => setOpen(false)} className="rounded-md p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Close assistant"><X className="h-4 w-4" /></button></div>
      <div className="max-h-64 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${message.from === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"}`}>{message.text}</div></div>)}</div>
      <div className="border-t border-border p-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quick help</p><div className="space-y-1.5">{quickReplies.map((item) => <button key={item.label} onClick={() => reply(item.label, item.answer)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground hover:bg-muted"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />{item.label}</button>)}</div><div className="mt-3 flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs text-muted-foreground"><span className="flex-1">Choose a quick question above</span><Send className="h-3.5 w-3.5" /></div></div>
    </div>}
    <button onClick={() => setOpen(!open)} className="fixed bottom-5 right-5 z-[61] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/25 transition-transform hover:scale-105" aria-label={open ? "Close assistant" : "Open assistant"} title="Open verification assistant"><MessageCircle className="h-6 w-6" /></button>
  </>;
}