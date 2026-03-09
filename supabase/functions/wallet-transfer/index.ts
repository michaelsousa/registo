import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Get the user from the JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { targetUserId, amount, description } = await req.json();

    if (!targetUserId || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot transfer to yourself" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS for the credit to receiver
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Check sender balance
    const { data: txs } = await adminClient
      .from("wallet_transactions")
      .select("type, amount")
      .eq("user_id", user.id);

    const balance = (txs || []).reduce((sum: number, tx: any) => {
      return sum + (tx.type === "credit" ? tx.amount : -tx.amount);
    }, 0);

    if (amount > balance) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get names
    const [senderRes, receiverRes] = await Promise.all([
      adminClient.from("profiles").select("full_name").eq("user_id", user.id).single(),
      adminClient.from("profiles").select("full_name").eq("user_id", targetUserId).single(),
    ]);

    const senderName = senderRes.data?.full_name || "Colaborador";
    const receiverName = receiverRes.data?.full_name || "Colaborador";

    // Insert both transactions
    const [debitRes, creditRes] = await Promise.all([
      adminClient.from("wallet_transactions").insert({
        user_id: user.id,
        created_by: user.id,
        type: "debit",
        amount,
        description: `Transferência para ${receiverName}${description ? ` - ${description}` : ""}`,
      }),
      adminClient.from("wallet_transactions").insert({
        user_id: targetUserId,
        created_by: user.id,
        type: "credit",
        amount,
        description: `Transferência de ${senderName}${description ? ` - ${description}` : ""}`,
      }),
    ]);

    if (debitRes.error || creditRes.error) {
      console.error("Transfer error:", debitRes.error, creditRes.error);
      return new Response(JSON.stringify({ error: "Transfer failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transfer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
