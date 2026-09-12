export type NewsDomain = "Politics" | "Sport";
export type Verdict = "Likely real" | "Needs review" | "Likely fake";

export interface NewsScan {
  id: string;
  headline: string;
  source: string;
  domain: NewsDomain;
  verdict: Verdict;
  confidence: number;
  credibility: number;
  scannedAt: string;
  reason: string;
  signals: string[];
}

export const newsScans: NewsScan[] = [
  {
    id: "scan-001",
    headline: "Senate committee publishes bipartisan climate funding proposal",
    source: "The Civic Ledger",
    domain: "Politics",
    verdict: "Likely real",
    confidence: 94,
    credibility: 91,
    scannedAt: "Today, 09:42",
    reason: "The claim matches two independent public records and uses specific, verifiable details.",
    signals: ["Named primary source", "Cross-source match", "Neutral language"],
  },
  {
    id: "scan-002",
    headline: "Championship final cancelled after players discover a secret rule",
    source: "Daily Sports Wire",
    domain: "Sport",
    verdict: "Likely fake",
    confidence: 89,
    credibility: 38,
    scannedAt: "Today, 08:16",
    reason: "No league bulletin confirms the cancellation and the headline uses an urgency trigger common in fabricated stories.",
    signals: ["No official confirmation", "Sensational framing", "Unverified source"],
  },
  {
    id: "scan-003",
    headline: "Local election offices extend registration deadline in three states",
    source: "Northstar News",
    domain: "Politics",
    verdict: "Needs review",
    confidence: 67,
    credibility: 72,
    scannedAt: "Yesterday, 17:05",
    reason: "The story has credible sourcing, but the deadline differs across state notices and needs manual checking.",
    signals: ["Partial source match", "Date ambiguity", "Regional claim"],
  },
  {
    id: "scan-004",
    headline: "Rookie goalkeeper breaks league save record in season opener",
    source: "The Athletic Brief",
    domain: "Sport",
    verdict: "Likely real",
    confidence: 92,
    credibility: 88,
    scannedAt: "Yesterday, 12:31",
    reason: "The statistics align with the league match report and the source links to a named competition record.",
    signals: ["Official statistic", "Named competition", "Consistent timeline"],
  },
  {
    id: "scan-005",
    headline: "Minister secretly resigns in midnight announcement, insiders claim",
    source: "The Viral Post",
    domain: "Politics",
    verdict: "Likely fake",
    confidence: 86,
    credibility: 24,
    scannedAt: "Mar 28, 2026",
    reason: "The article relies on unnamed insiders, has no primary document, and is not corroborated by reputable outlets.",
    signals: ["Anonymous sourcing", "No primary evidence", "High emotional language"],
  },
];

export const domainOptions: Array<"All domains" | NewsDomain> = ["All domains", "Politics", "Sport"];
