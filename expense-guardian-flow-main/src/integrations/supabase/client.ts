import { expenses as seedExpenses, currentUser } from "@/lib/mock-data";

type Listener = (event: string, session: LocalSession | null) => void;
type LocalUser = {
  id: string;
  email: string;
  user_metadata: { full_name: string; must_change_password?: boolean };
};
type LocalSession = { user: LocalUser };

const companyId = "local-company";
const userId = "local-user";
const storageKey = "expenseiq-local-session";
const listeners = new Set<Listener>();

const profile = {
  id: "local-profile",
  user_id: userId,
  full_name: currentUser.name,
  email: currentUser.email,
  company_id: companyId,
  department: "Finance",
  avatar_url: null,
};

const localUser: LocalUser = {
  id: userId,
  email: currentUser.email,
  user_metadata: { full_name: currentUser.name },
};

const rows: Record<string, any[]> = {
  companies: [{ id: companyId, name: currentUser.company, country: "United States", base_currency: "USD" }],
  profiles: [profile],
  user_roles: [{ id: "local-role", user_id: userId, role: currentUser.role }],
  expenses: seedExpenses.map((expense, index) => ({
    id: expense.id,
    company_id: companyId,
    user_id: userId,
    title: expense.title,
    merchant: expense.merchant,
    amount: expense.amount,
    currency: expense.currency,
    normalized_amount: expense.normalizedAmount,
    base_currency: expense.baseCurrency,
    category: expense.category,
    expense_date: expense.date,
    status: expense.status,
    receipt_url: expense.receiptUrl || null,
    notes: expense.notes || null,
    created_at: `2026-03-${String(28 - index).padStart(2, "0")}T12:00:00.000Z`,
  })),
  approval_steps: [],
  fraud_alerts: [],
};

function currentSession(): LocalSession | null {
  return localStorage.getItem(storageKey) ? { user: localUser } : null;
}

function notify(event: string, session: LocalSession | null) {
  listeners.forEach((listener) => listener(event, session));
}

class LocalQuery {
  private result: any[];
  private singleResult = false;
  private mutation: { type: "update" | "delete"; values?: any } | null = null;

  constructor(private table: string) {
    this.result = [...(rows[table] || [])];
  }

  select(columns = "*") {
    if (columns !== "*") {
      const fields = columns.split(",").map((field) => field.trim());
      this.result = this.result.map((row) => Object.fromEntries(fields.map((field) => [field, row[field]])));
    }
    return this;
  }

  eq(field: string, value: any) {
    this.result = this.result.filter((row) => row[field] === value);
    return this;
  }

  in(field: string, values: any[]) {
    this.result = this.result.filter((row) => values.includes(row[field]));
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.result.sort((a, b) => {
      const left = a[field] ?? "";
      const right = b[field] ?? "";
      const comparison = left > right ? 1 : left < right ? -1 : 0;
      return options?.ascending === false ? -comparison : comparison;
    });
    return this;
  }

  limit(count: number) {
    this.result = this.result.slice(0, count);
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  insert(values: any | any[]) {
    const items = Array.isArray(values) ? values : [values];
    const inserted = items.map((item) => ({ id: item.id || crypto.randomUUID(), ...item }));
    rows[this.table] = [...(rows[this.table] || []), ...inserted];
    this.result = inserted;
    return this;
  }

  update(values: any) {
    this.mutation = { type: "update", values };
    return this;
  }

  delete() {
    this.mutation = { type: "delete" };
    return this;
  }

  then(resolve: (value: { data: any; error: null }) => any) {
    if (this.mutation?.type === "update") {
      const ids = new Set(this.result.map((row) => row.id));
      rows[this.table] = (rows[this.table] || []).map((row) => ids.has(row.id) ? { ...row, ...this.mutation?.values } : row);
      this.result = this.result.map((row) => ({ ...row, ...this.mutation?.values }));
    }
    if (this.mutation?.type === "delete") {
      const ids = new Set(this.result.map((row) => row.id));
      rows[this.table] = (rows[this.table] || []).filter((row) => !ids.has(row.id));
      this.result = [];
    }
    const data = this.singleResult ? (this.result[0] || null) : this.result;
    return Promise.resolve(resolve({ data, error: null }));
  }
}

export const supabase = {
  from: (table: string) => new LocalQuery(table),
  auth: {
    getSession: async () => ({ data: { session: currentSession() }, error: null }),
    onAuthStateChange: (listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    },
    signInWithPassword: async ({ email }: { email: string; password: string }) => {
      if (!email) return { data: { session: null }, error: new Error("Enter your email address") };
      localStorage.setItem(storageKey, "signed-in");
      notify("SIGNED_IN", currentSession());
      return { data: { session: currentSession() }, error: null };
    },
    signUp: async ({ email, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }) => {
      localUser.email = email;
      localUser.user_metadata.full_name = options?.data?.full_name || "Demo User";
      profile.email = email;
      profile.full_name = localUser.user_metadata.full_name;
      localStorage.setItem(storageKey, "signed-in");
      notify("SIGNED_IN", currentSession());
      return { data: { session: currentSession() }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem(storageKey);
      notify("SIGNED_OUT", null);
      return { error: null };
    },
    updateUser: async (updates: { password?: string; data?: Record<string, unknown> }) => {
      if (updates.data) localUser.user_metadata = { ...localUser.user_metadata, ...updates.data };
      return { data: { user: localUser }, error: null };
    },
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
  },
  functions: {
    invoke: async (name: string) => {
      if (name === "scan-receipt") return { data: {}, error: null };
      return { data: { flagged: false }, error: null };
    },
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: { path: "local-receipt" }, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
    }),
  },
  rpc: async () => ({ data: {}, error: null }),
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: async () => "ok",
};