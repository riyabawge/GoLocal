import { NextResponse } from "next/server";

type CoachRequest = {
  message?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  city?: string;
  language?: string;
  purpose?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Add GEMINI_API_KEY to .env.local to turn on Prof GoGo’s personalized lessons." },
      { status: 503 },
    );
  }

  let body: CoachRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send a valid message." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message || message.length > 1000) {
    return NextResponse.json({ error: "Keep your question between 1 and 1000 characters." }, { status: 400 });
  }
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((item) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }))
    : [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You are Prof GoGo, a practical, encouraging travel language tutor. Turn the traveller's latest request into a short, clearly scoped mini lesson about exactly that situation. Trip context: destination ${body.city || "not specified"}; target language ${body.language || "not specified"}; trip style ${body.purpose || "not specified"}. If they say “coffee”, teach how to order coffee; do not answer generically or merely echo their words. Return a compact lesson with these exact headings: MODULE, GOAL, USEFUL PHRASES, TRY IT, TIP. Under USEFUL PHRASES give 3 natural target-language phrases, each with an easy pronunciation guide and English meaning. TRY IT should ask one specific question in English and invite the learner to type or say an answer. TIP gives one practical cultural/context note, avoiding invented local facts. Use English explanations, match the chosen target language for phrases, and keep the whole lesson under 180 words. If conversation history exists, tailor the new module to the latest request without repeating prior modules. Never claim a phrase guarantees safety, entry, a reservation, or a booking.` }] },
        contents: [
          ...messages.map((item) => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.content }] })),
          ...(!messages.length ? [{ role: "user", parts: [{ text: message }] }] : []),
        ],
        generationConfig: { temperature: 0.55, maxOutputTokens: 500 },
      }),
      signal: controller.signal,
    });

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Prof GoGo couldn’t build that module just now. Try again." },
        { status: 502 },
      );
    }

    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();

    if (!reply) {
      return NextResponse.json({ error: "Prof GoGo returned an empty lesson. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ reply, moduleTitle: reply.match(/^MODULE:\s*(.+)$/m)?.[1] || "Your custom lesson" });
  } catch {
    return NextResponse.json(
      { error: "Prof GoGo’s lesson request timed out or couldn’t connect. Please try again." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
