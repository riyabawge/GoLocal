import { NextResponse } from "next/server";

const languages = new Set(["English", "French", "Italian", "German", "Portuguese", "Spanish", "Japanese"]);
type Turn = { speaker: "you" | "local"; original: string; translated: string };

export async function POST(request: Request) {
  let body: { text?: unknown; source?: unknown; target?: unknown; scenario?: unknown; city?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a role-play message as JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const source = typeof body.source === "string" ? body.source : "English";
  const target = typeof body.target === "string" ? body.target : "French";
  const scenario = typeof body.scenario === "string" ? body.scenario.slice(0, 80) : "A travel conversation";
  const city = typeof body.city === "string" ? body.city.slice(0, 80) : "the destination";
  if (!text || text.length > 500) return NextResponse.json({ error: "Keep your role-play line between 1 and 500 characters." }, { status: 400 });
  if (!languages.has(source) || !languages.has(target)) return NextResponse.json({ error: "Choose supported conversation languages." }, { status: 400 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini role-play is not configured. Add GEMINI_API_KEY to .env.local." }, { status: 503 });

  const history = Array.isArray(body.history)
    ? (body.history as Turn[]).slice(-8).map((turn) => ({
        role: turn.speaker === "local" ? "model" : "user",
        parts: [{ text: `${turn.original}\n${turn.translated}` }],
      }))
    : [];
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You are a kind local person helping a traveller practise. Role-play this situation: ${scenario} in ${city}. The traveller speaks ${source}; you speak ${target}. Return only JSON with keys traveller_line (natural translation of the traveller's line in ${target}), reply (what the local says, in ${target}), meaning (English translation of the reply), and coach_tip (one gentle language or context tip in English). Keep the local reply brief. Never claim to know a real person's intentions or safety.` }] },
        contents: [...history, { role: "user", parts: [{ text: `Traveller says: ${text}` }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 350,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { traveller_line: { type: "STRING" }, reply: { type: "STRING" }, meaning: { type: "STRING" }, coach_tip: { type: "STRING" } },
            required: ["traveller_line", "reply", "meaning", "coach_tip"],
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) return NextResponse.json({ error: result.error?.message || "Gemini could not continue this role-play." }, { status: 502 });
    const content = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!content) return NextResponse.json({ error: "Gemini returned no role-play response." }, { status: 502 });
    try {
      const parsed = JSON.parse(content) as { traveller_line?: string; reply?: string; meaning?: string; coach_tip?: string };
      if (!parsed.reply) throw new Error("missing reply");
      return NextResponse.json({ travellerLine: parsed.traveller_line || "", reply: parsed.reply, meaning: parsed.meaning || "", coachTip: parsed.coach_tip || "" });
    } catch {
      return NextResponse.json({ error: "Gemini returned a response in an unexpected format. Please try again." }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Gemini role-play timed out. Try again." }, { status: 502 });
  }
}
