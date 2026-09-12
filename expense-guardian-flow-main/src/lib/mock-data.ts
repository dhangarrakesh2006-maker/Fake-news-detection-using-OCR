export type ExpenseStatus = "pending" | "approved" | "rejected" | "in_review";
export type UserRole = "admin" | "manager" | "employee";

export interface Expense {
  id: string;
  title: string;
  merchant: string;
  amount: number;
  currency: string;
  normalizedAmount: number;
  baseCurrency: string;
  category: string;
  date: string;
  status: ExpenseStatus;
  submittedBy: string;
  submittedByAvatar: string;
  approvalChain: ApprovalStep[];
  receiptUrl?: string;
  notes?: string;
}

export interface ApprovalStep {
  role: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "waiting";
  date?: string;
  comment?: string;
}

export interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
}

export const currentUser = {
  name: "User",
  email: "user@acme.co",
  role: "admin" as UserRole,
  avatar: "U",
  company: "Acme Corp",
  baseCurrency: "USD",
};

export const stats: StatCard[] = [
  { label: "Total Expenses", value: "$48,250", change: "+12.5%", changeType: "positive", icon: "receipt" },
  { label: "Pending Review", value: "23", change: "+3", changeType: "neutral", icon: "clock" },
  { label: "Approved This Month", value: "$31,400", change: "+8.2%", changeType: "positive", icon: "check-circle" },
  { label: "Avg. Processing Time", value: "1.8 days", change: "-0.4d", changeType: "positive", icon: "zap" },
];

export const expenses: Expense[] = [
  {
    id: "EXP-001",
    title: "Client Dinner - Tokyo",
    merchant: "Sushi Saito",
    amount: 45000,
    currency: "JPY",
    normalizedAmount: 312.50,
    baseCurrency: "USD",
    category: "Meals & Entertainment",
    date: "2026-03-25",
    status: "in_review",
    submittedBy: "Team member",
    submittedByAvatar: "U",
    approvalChain: [
      { role: "Manager", name: "Approver", status: "approved", date: "2026-03-26", comment: "Approved - valid client expense" },
      { role: "Finance", name: "Approver", status: "pending" },
      { role: "Director", name: "Approver", status: "waiting" },
    ],
  },
  {
    id: "EXP-002",
    title: "Conference Registration",
    merchant: "Web Summit",
    amount: 899,
    currency: "EUR",
    normalizedAmount: 975.50,
    baseCurrency: "USD",
    category: "Training & Development",
    date: "2026-03-22",
    status: "approved",
    submittedBy: "Team member",
    submittedByAvatar: "U",
    approvalChain: [
      { role: "Manager", name: "Approver", status: "approved", date: "2026-03-23" },
      { role: "Finance", name: "Approver", status: "approved", date: "2026-03-24" },
    ],
  },
  {
    id: "EXP-003",
    title: "Software License - Figma",
    merchant: "Figma Inc.",
    amount: 144,
    currency: "USD",
    normalizedAmount: 144,
    baseCurrency: "USD",
    category: "Software & Tools",
    date: "2026-03-20",
    status: "pending",
    submittedBy: "Team member",
    submittedByAvatar: "U",
    approvalChain: [
      { role: "Manager", name: "Approver", status: "pending" },
      { role: "Finance", name: "Approver", status: "waiting" },
    ],
  },
  {
    id: "EXP-004",
    title: "Flight - NYC to London",
    merchant: "British Airways",
    amount: 2850,
    currency: "GBP",
    normalizedAmount: 3610.50,
    baseCurrency: "USD",
    category: "Travel",
    date: "2026-03-18",
    status: "rejected",
    submittedBy: "Team member",
    submittedByAvatar: "U",
    approvalChain: [
      { role: "Manager", name: "Approver", status: "approved", date: "2026-03-19" },
      { role: "Finance", name: "Approver", status: "rejected", date: "2026-03-20", comment: "Exceeds travel budget. Please rebook economy." },
    ],
  },
  {
    id: "EXP-005",
    title: "Office Supplies",
    merchant: "Staples",
    amount: 234.80,
    currency: "USD",
    normalizedAmount: 234.80,
    baseCurrency: "USD",
    category: "Office Supplies",
    date: "2026-03-15",
    status: "approved",
    submittedBy: "Team member",
    submittedByAvatar: "U",
    approvalChain: [
      { role: "Manager", name: "Approver", status: "approved", date: "2026-03-16" },
    ],
  },
  {
    id: "EXP-006",
    title: "Uber - Airport Transfer",
    merchant: "Uber Technologies",
    amount: 67.30,
    currency: "USD",
    normalizedAmount: 67.30,
    baseCurrency: "USD",
    category: "Travel",
    date: "2026-03-27",
    status: "pending",
    submittedBy: "Team member",
    submittedByAvatar: "U",
    approvalChain: [
      { role: "Manager", name: "Approver", status: "pending" },
    ],
  },
];

export const monthlyData = [
  { month: "Oct", expenses: 28400, approved: 24200 },
  { month: "Nov", expenses: 35100, approved: 31800 },
  { month: "Dec", expenses: 41200, approved: 36500 },
  { month: "Jan", expenses: 33800, approved: 30100 },
  { month: "Feb", expenses: 39500, approved: 35200 },
  { month: "Mar", expenses: 48250, approved: 31400 },
];

export const categoryData = [
  { name: "Travel", value: 38, color: "hsl(222, 47%, 14%)" },
  { name: "Meals", value: 22, color: "hsl(160, 84%, 39%)" },
  { name: "Software", value: 18, color: "hsl(38, 92%, 50%)" },
  { name: "Office", value: 12, color: "hsl(217, 91%, 60%)" },
  { name: "Other", value: 10, color: "hsl(215, 16%, 47%)" },
];

export const currencies = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL",
];

export const categories = [
  "Travel", "Meals & Entertainment", "Software & Tools", "Office Supplies",
  "Training & Development", "Marketing", "Equipment", "Miscellaneous",
];
