import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanBase64(base64String: string): string {
  if (!base64String) return "";
  let cleaned = base64String.trim();
  if (cleaned.includes(",") && cleaned.startsWith("data:")) {
    cleaned = cleaned.split(",")[1];
  }
  cleaned = cleaned.replace(/\s/g, "");
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { capturedImage, referenceImage } = await req.json();

    if (!capturedImage || !referenceImage) {
      return new Response(
        JSON.stringify({ error: "Both images are required", match: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const capturedB64 = cleanBase64(capturedImage);
    const referenceB64 = cleanBase64(referenceImage);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a facial recognition system. Compare the two face photos provided. 
Determine if they are the SAME person. Consider lighting, angle, and expression differences.
You MUST respond with ONLY a JSON object: {"match": true, "confidence": 0.95} or {"match": false, "confidence": 0.2}
- match: boolean indicating if it's the same person
- confidence: number from 0 to 1
Only respond with the JSON, nothing else.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Compare these two face photos. Are they the same person? Photo 1 is the reference, Photo 2 was just taken.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${referenceB64}` },
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${capturedB64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later", match: false }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required", match: false }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // On AI error, allow the punch (fail-open) but log the issue
      return new Response(
        JSON.stringify({ match: true, confidence: 0, skipped: true, error: "AI unavailable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the AI response
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({
            match: !!result.match,
            confidence: Number(result.confidence) || 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
    }

    // Fallback: if we can't parse, fail-open
    return new Response(
      JSON.stringify({ match: true, confidence: 0, skipped: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("compare-faces error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", match: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
