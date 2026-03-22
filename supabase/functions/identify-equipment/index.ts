import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const PROMPT = `You are a certified personal trainer and gym equipment expert. Identify the gym equipment in this photo and provide usage guidance. Respond ONLY in JSON with this structure: { "equipment_name": string, "category": string, "primary_muscles": [string], "secondary_muscles": [string], "instructions": [string], "common_mistakes": [string], "beginner_tip": string }. Instructions should be 3-5 clear steps. If the image does not show gym equipment, return an error field.`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `Groq API error: ${err}` }, { status: 502, headers: CORS_HEADERS });
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Could not parse AI response" }, { status: 500, headers: CORS_HEADERS });
    }

    return Response.json(JSON.parse(jsonMatch[0]), { headers: CORS_HEADERS });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
