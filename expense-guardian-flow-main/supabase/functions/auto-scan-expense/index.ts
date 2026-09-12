import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const { expense_id } = await req.json();
    if (!expense_id) throw new Error("expense_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: companyId } = await userClient.rpc("get_user_company_id", { _user_id: user.id });
    if (!companyId) throw new Error("No company found");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch the new expense + recent expenses for context
    const { data: newExpense, error: newErr } = await adminClient
      .from("expenses")
      .select("id, title, merchant, amount, currency, category, expense_date, user_id, receipt_url, notes, status")
      .eq("id", expense_id)
      .single();
    if (newErr || !newExpense) throw new Error("Expense not found");

    // Get recent expenses from same company for pattern comparison
    const { data: recentExpenses } = await adminClient
      .from("expenses")
      .select("id, title, merchant, amount, currency, category, expense_date, user_id, status")
      .eq("company_id", companyId)
      .neq("id", expense_id)
      .order("created_at", { ascending: false })
      .limit(30);

    // Get profile for context
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, department")
      .eq("user_id", newExpense.user_id)
      .single();

    const enrichedNew = {
      ...newExpense,
      employee_name: profile?.full_name || "Unknown",
      department: profile?.department || "Unknown",
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a corporate expense fraud detection AI. Analyze a SINGLE newly submitted expense against recent company expenses for fraud indicators:
- Duplicate or near-duplicate expenses (same merchant, similar amounts, close dates)
- Unusually high amounts for the category
- Round number amounts that may indicate fabricated receipts
- Mismatched categories (e.g., "meals" at an electronics store)
- Rapid successive submissions from the same employee
- Missing receipts for high-value items

Respond using the analyze_expense tool. If the expense looks normal, return risk_score 0 and is_suspicious false.
Only flag genuinely suspicious items.`,
          },
          {
            role: "user",
            content: `New expense to analyze:\n${JSON.stringify(enrichedNew, null, 2)}\n\nRecent company expenses for context:\n${JSON.stringify(recentExpenses || [], null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_expense",
              description: "Return fraud analysis for a single expense",
              parameters: {
                type: "object",
                properties: {
                  is_suspicious: { type: "boolean", description: "Whether this expense is suspicious" },
                  risk_score: { type: "number", description: "0-100 risk score" },
                  risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  flags: { type: "array", items: { type: "string" }, description: "Fraud indicators found" },
                  summary: { type: "string", description: "Brief explanation" },
                },
                required: ["is_suspicious", "risk_score", "risk_level", "flags", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_expense" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ flagged: false, message: "Rate limited" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ flagged: false, message: "AI credits exhausted" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI analysis failed");
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return analysis");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Only store alert if suspicious
    if (analysis.is_suspicious && analysis.risk_score >= 30) {
      await adminClient.from("fraud_alerts").insert({
        expense_id,
        company_id: companyId,
        risk_score: analysis.risk_score,
        risk_level: analysis.risk_level,
        flags: analysis.flags,
        ai_summary: analysis.summary,
      });
    }

    return new Response(JSON.stringify({
      flagged: analysis.is_suspicious && analysis.risk_score >= 30,
      risk_level: analysis.risk_level,
      risk_score: analysis.risk_score,
      summary: analysis.summary,
      flags: analysis.flags,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
