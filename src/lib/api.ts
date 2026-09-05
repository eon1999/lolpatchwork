import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** 429 with a Retry-After header so well-behaved clients back off. */
export function tooMany(retryAfterSec: number, message: string): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: "RATE_LIMITED", message } },
    { status: 429, headers: { "retry-after": String(Math.max(1, retryAfterSec)) } },
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guards uuid-typed params before they reach Postgres (avoids 22P02 → 500). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

const MAX_BODY_BYTES = 32_768;

/**
 * Parses a JSON request body with a hard byte cap (default 32KB) so oversized
 * payloads are rejected with 413 before burning CPU on parse/validation.
 * Malformed JSON parses to `{}` to keep route validation in charge.
 */
export async function readJson<T>(req: Request, maxBytes = MAX_BODY_BYTES): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "Request body too large.", 413);
  }
  if (!req.body) return {} as T;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ApiError("PAYLOAD_TOO_LARGE", "Request body too large.", 413);
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : Buffer.concat(chunks.map((c) => Buffer.from(c))),
  );
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Maps the shared throw-on-error conventions (ApiError, BANNED, RATE_LIMITED)
 * to responses. Returns null when the error should keep bubbling.
 */
export function mapRouteError(err: unknown): NextResponse | null {
  if (err instanceof ApiError) return fail(err.code, err.message, err.status);
  if (err instanceof Error) {
    if (err.message === "BANNED") return fail("BANNED", "Nope.", 403);
    if (err.message === "RATE_LIMITED") {
      return tooMany(60, "Too many requests. Wait a bit.");
    }
  }
  return null;
}
