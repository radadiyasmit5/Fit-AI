import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function dbGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  return res.json();
}

async function dbPost(table: string, data: object) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Fetch current session + its sets
    const [sessions, currentSets] = await Promise.all([
      dbGet(`workout_sessions?id=eq.${sessionId}&select=*`),
      dbGet(`workout_sets?session_id=eq.${sessionId}&select=*`),
    ]);

    const session = sessions[0];
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404, headers: CORS_HEADERS });
    }

    const userId = session.user_id;

    if (!currentSets.length) {
      return Response.json({ error: "No sets found for this session" }, { status: 400, headers: CORS_HEADERS });
    }

    // Get unique exercise IDs from current session
    const exerciseIds = [...new Set(currentSets.map((s: { exercise_id: string }) => s.exercise_id))];
    const exerciseIdList = exerciseIds.map((id) => `"${id}"`).join(",");

    // Fetch exercise names and previous session's sets in parallel
    const [exercisesData, prevSessions] = await Promise.all([
      dbGet(`exercises?id=in.(${exerciseIdList})&select=id,name`),
      dbGet(
        `workout_sessions?user_id=eq.${userId}&completed_at=not.is.null&id=neq.${sessionId}&order=started_at.desc&limit=5&select=id,started_at`
      ),
    ]);

    const exerciseMap: Record<string, string> = {};
    for (const e of exercisesData) exerciseMap[e.id] = e.name;

    // Find previous sets for same exercises
    let prevSets: { exercise_id: string; reps: number; weight: number }[] = [];
    for (const prevSession of prevSessions) {
      const sets = await dbGet(
        `workout_sets?session_id=eq.${prevSession.id}&exercise_id=in.(${exerciseIdList})&select=exercise_id,reps,weight`
      );
      if (sets.length > 0) {
        prevSets = sets;
        break;
      }
    }

    // Build comparison per exercise
    const comparison: Record<string, {
      current: { reps: number; weight: number }[];
      previous: { reps: number; weight: number }[];
    }> = {};

    for (const id of exerciseIds) {
      comparison[exerciseMap[id] ?? id] = {
        current: currentSets.filter((s: { exercise_id: string }) => s.exercise_id === id).map((s: { reps: number; weight: number }) => ({ reps: s.reps, weight: s.weight })),
        previous: prevSets.filter((s: { exercise_id: string }) => s.exercise_id === id).map((s: { reps: number; weight: number }) => ({ reps: s.reps, weight: s.weight })),
      };
    }

    // Build Groq prompt
    const comparisonText = Object.entries(comparison)
      .map(([name, data]) => {
        const currVol = data.current.reduce((s, x) => s + x.reps * x.weight, 0);
        const prevVol = data.previous.reduce((s, x) => s + x.reps * x.weight, 0);
        const currSets = data.current.map((s) => `${s.weight}kg×${s.reps}`).join(", ");
        const prevSets = data.previous.length
          ? data.previous.map((s) => `${s.weight}kg×${s.reps}`).join(", ")
          : "no previous data";
        const trend = prevVol === 0 ? "first time" : currVol > prevVol ? "progressing" : currVol < prevVol ? "regressing" : "plateaued";
        return `${name}: current=[${currSets}] previous=[${prevSets}] trend=${trend}`;
      })
      .join("\n");

    const prompt = `You are a strength coach. Analyze this workout performance and give specific, actionable feedback.

EXERCISE COMPARISON:
${comparisonText}

Respond ONLY with JSON in this format:
{
  "summary": "1-2 sentence overall assessment",
  "exercises": [
    {
      "name": "exercise name",
      "trend": "progressing" | "plateaued" | "regressing" | "first_time",
      "insight": "specific observation about this exercise",
      "suggestion": "concrete next session target (e.g., 'Try 85kg × 8 reps')"
    }
  ],
  "next_focus": "one sentence on what to prioritize next session"
}`;

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      return Response.json({ error: "AI analysis failed" }, { status: 502, headers: CORS_HEADERS });
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Workout logged.", exercises: [], next_focus: "" };

    // Store adaptation in DB
    await dbPost("workout_adaptations", {
      user_id: userId,
      session_id: sessionId,
      recommendations: analysis,
    });

    return Response.json(analysis, { headers: CORS_HEADERS });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
