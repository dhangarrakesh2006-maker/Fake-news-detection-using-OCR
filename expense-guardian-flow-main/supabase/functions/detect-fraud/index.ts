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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isCeo } = await userClient.rpc("has_role", { _user_id: user.id, _role: "ceo" });
    if (!isAdmin && !isCeo) throw new Error("Admin or CEO access required");

    // Get user's company
    const { data: companyId } = await userClient.rpc("get_user_company_id", { _user_id: user.id });
    if (!companyId) throw new Error("No company found");

    // Fetch recent expenses for the company (service role to get all)
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: expenses, error: expError } = await adminClient
      .from("expenses")
      .select("id, title, merchant, amount, currency, category, expense_date, user_id, receipt_url, notes, status")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (expError) throw expError;
    if (!expenses || expenses.length === 0) {
      return new Response(JSON.stringify({ alerts: [], message: "No expenses to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for context
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name, department")
      .eq("company_id", companyId);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Enrich expenses with employee names
    const enrichedExpenses = expenses.map(e => ({
      ...e,
      employee_name: profileMap[e.user_id]?.full_name || "Unknown",
      department: profileMap[e.user_id]?.department || "Unknown",
    }));

    // Call AI for fraud analysis
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
            content: `You are a corporate expense fraud detection AI. Analyze expense records for potential fraud indicators including:
- Duplicate or near-duplicate expenses (same merchant, similar amounts, close dates)
- Unusually high amounts for the category
- Weekend/holiday submissions that seem suspicious
- Round number amounts that may indicate fabricated receipts
- Frequent expenses just below approval thresholds
- Mismatched categories (e.g., "meals" at an electronics store)
- Rapid successive submissions
- Missing receipts for high-value items

For each suspicious expense, provide a risk score (0-100), risk level (low/medium/high/critical), specific flags, and a brief explanation.
Only flag genuinely suspicious items. Do not flag normal business expenses.
Always respond using the analyze_expenses tool.`,
          },
          {
            role: "user",
            content: `Analyze these ${enrichedExpenses.length} company expenses for fraud:\n${JSON.stringify(enrichedExpenses, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_expenses",
              description: "Return fraud analysis results for expenses",
              parameters: {
                type: "object",
                properties: {
                  flagged_expenses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        expense_id: { type: "string", description: "The expense UUID" },
                        risk_score: { type: "number", description: "0-100 risk score" },
                        risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        flags: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of fraud indicators found",
                        },
                        summary: { type: "string", description: "Brief explanation of why this is suspicious" },
                      },
                      required: ["expense_id", "risk_score", "risk_level", "flags", "summary"],
                      additionalProperties: false,
                    },
                  },
                  overall_summary: { type: "string", description: "Overall fraud risk assessment for the company" },
                },
                required: ["flagged_expenses", "overall_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_expenses" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Store flagged expenses in fraud_alerts table
    if (analysis.flagged_expenses?.length > 0) {
      // Clear old unreviewed alerts for this company
      await adminClient
        .from("fraud_alerts")
        .delete()
        .eq("company_id", companyId)
        .eq("reviewed", false);

      const alertRows = analysis.flagged_expenses.map((f: any) => ({
        expense_id: f.expense_id,
        company_id: companyId,
        risk_score: f.risk_score,
        risk_level: f.risk_level,
        flags: f.flags,
        ai_summary: f.summary,
      }));

      await adminClient.from("fraud_alerts").insert(alertRows);
    }

    return new Response(JSON.stringify({
      alerts: analysis.flagged_expenses || [],
      overall_summary: analysis.overall_summary,
      expenses_analyzed: enrichedExpenses.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-fraud error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
