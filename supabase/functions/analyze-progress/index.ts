import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const PROMPT = `You are a supportive fitness coach reviewing a user's body progress photos. The first image is the earlier (before) photo, the second is the more recent (after) photo. Focus only on observable physical changes such as posture, muscle definition, and body composition in an encouraging and constructive tone. Respond ONLY in JSON with this structure: { "summary": string, "observations": [string], "encouragement": string }. Never make negative comments about the user's body. Never give medical advice. If photos are unclear or not showing a person, return an error field.`;

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
    const { before_image, after_image } = await req.json();

    if (!before_image || !after_image) {
      return Response.json({ error: "Two images required (before and after)" }, { status: 400 });
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
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${before_image}` } },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${after_image}` } },
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
