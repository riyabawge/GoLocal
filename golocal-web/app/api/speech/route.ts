import { NextResponse } from "next/server";

const languages = new Set(["English", "French", "Italian", "German", "Portuguese", "Spanish", "Japanese"]);
const supportedAudioTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac", "audio/flac"]);
const maximumAudioBytes = 12 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Record a short phrase and try again." }, { status: 400 });
  }

  const audio = form.get("audio");
  const language = form.get("language");
  if (!(audio instanceof File)) return NextResponse.json({ error: "No microphone recording was received." }, { status: 400 });
  if (typeof language !== "string" || !languages.has(language)) return NextResponse.json({ error: "Choose a supported speech language." }, { status: 400 });
  const mimeType = audio.type.split(";")[0];
  if (!supportedAudioTypes.has(mimeType)) return NextResponse.json({ error: "This browser recorded an unsupported audio format. Try Chrome or Safari." }, { status: 415 });
  if (!audio.size || audio.size > maximumAudioBytes) return NextResponse.json({ error: "The recording is empty or too long. Keep it under 12 MB and try again." }, { status: 413 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini speech recognition is not configured. Add GEMINI_API_KEY to .env.local." }, { status: 503 });
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `Transcribe the spoken audio accurately in ${language}. Return only the words actually spoken in that language, with normal punctuation. Do not translate, explain, infer intent, or add speech that is not present.` }] },
        contents: [{ role: "user", parts: [{ text: `Transcribe this short ${language} travel conversation turn.` }, { inlineData: { mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 500 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) return NextResponse.json({ error: result.error?.message || "Gemini could not transcribe that recording." }, { status: 502 });
    const transcript = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!transcript) return NextResponse.json({ error: "No speech was recognised. Try again a little closer to the microphone." }, { status: 422 });
    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json({ error: "Speech recognition timed out. Try again." }, { status: 502 });
  }
}
