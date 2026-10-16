import { NextRequest } from "next/server";

const API_ROOT = (process.env.PARVOY_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`${API_ROOT}/api/v1/${path.map(encodeURIComponent).join("/")}`);
  target.search = request.nextUrl.search;

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: request.method === "GET" ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      ...(request.method === "GET" ? {} : { body: await request.text() }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") || "application/json" });
    const totalCount = upstream.headers.get("x-total-count");
    if (totalCount) headers.set("x-total-count", totalCount);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json(
      { detail: "The GoLocal learning service is offline. Start the GoLocal API and try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
