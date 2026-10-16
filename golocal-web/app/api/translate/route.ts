import { NextResponse } from "next/server";

const languages = new Set(["English", "French", "Italian", "German", "Portuguese", "Spanish", "Japanese"]);

export async function POST(request: Request) {
  let body: { text?: unknown; source?: unknown; target?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a phrase as JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const source = typeof body.source === "string" ? body.source : "English";
  const target = typeof body.target === "string" ? body.target : "French";
  if (!text || text.length > 500) return NextResponse.json({ error: "Enter a phrase between 1 and 500 characters." }, { status: 400 });
  if (!languages.has(source) && source !== "auto") return NextResponse.json({ error: "Choose a supported source language." }, { status: 400 });
  if (!languages.has(target)) return NextResponse.json({ error: "Choose a supported target language." }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local to enable live translation." }, { status: 503 });

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Translate the user's text naturally and faithfully for travel. Return only the translated text, with no explanation or quotation marks. Preserve names, numbers, tone, and intent. Do not add facts." }] },
        contents: [{ role: "user", parts: [{ text: `Translate from ${source === "auto" ? "the detected language" : source} into ${target}:\n${text}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) return NextResponse.json({ error: result.error?.message || "Gemini could not translate that phrase." }, { status: 502 });
    const translation = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!translation) return NextResponse.json({ error: "Gemini returned no translated text." }, { status: 502 });
    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json({ error: "Gemini translation timed out. Try again." }, { status: 502 });
  }
}
