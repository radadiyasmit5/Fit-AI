import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(context: {
  profile: { name: string; age: number; weight: number; height: number; goal: string };
  recentMeals: { calories: number; protein: number; carbs: number; fat: number; logged_at: string }[];
  recentWorkouts: { started_at: string; completed_at: string | null }[];
}): string {
  const { profile, recentMeals, recentWorkouts } = context;

  const goalLabel =
    profile.goal === "lose_weight" ? "Lose Weight"
    : profile.goal === "build_muscle" ? "Build Muscle"
    : "Maintain Fitness";

  let prompt = `You are a concise personal AI fitness coach. Give short, direct answers (2-4 sentences). Be specific to the user's data. Never give generic advice when you have real data to reference.

USER:
Name: ${profile.name}, Age: ${profile.age}, Weight: ${profile.weight}kg, Height: ${profile.height}cm
Goal: ${goalLabel}
`;

  if (recentMeals.length > 0) {
    const byDate: Record<string, typeof recentMeals> = {};
    for (const m of recentMeals) {
      const d = m.logged_at.split("T")[0];
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(m);
    }
    const avgCal = recentMeals.reduce((s, m) => s + m.calories, 0) / Object.keys(byDate).length;
    const avgProt = recentMeals.reduce((s, m) => s + m.protein, 0) / Object.keys(byDate).length;
    prompt += `\nNUTRITION (last 7 days avg): ${Math.round(avgCal)} cal/day, ${Math.round(avgProt)}g protein/day\n`;
    const dates = Object.keys(byDate).sort().slice(-3);
    for (const d of dates) {
      const meals = byDate[d];
      const cal = meals.reduce((s, m) => s + m.calories, 0);
      const prot = meals.reduce((s, m) => s + m.protein, 0);
      prompt += `  ${d}: ${Math.round(cal)} cal, ${Math.round(prot)}g protein\n`;
    }
  } else {
    prompt += "\nNUTRITION: No meals logged this week.\n";
  }

  if (recentWorkouts.length > 0) {
    prompt += `\nWORKOUTS this week: ${recentWorkouts.length} sessions completed\n`;
    for (const s of recentWorkouts.slice(0, 3)) {
      const dur = s.completed_at
        ? Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)
        : 0;
      prompt += `  ${new Date(s.started_at).toDateString()}: ${dur} min\n`;
    }
  } else {
    prompt += "\nWORKOUTS: No workouts logged this week.\n";
  }

  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { messages, context } = await req.json();

    if (!GROQ_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500, headers: CORS_HEADERS });
    }

    const systemPrompt = buildSystemPrompt(context);

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `Groq API error: ${err}` }, { status: 502, headers: CORS_HEADERS });
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content ?? "";

    return Response.json({ response: reply }, { headers: CORS_HEADERS });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
