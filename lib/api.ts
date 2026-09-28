// Thin client for the PurrOS REST API (/api/v1), called from the browser with the
// session cookie. See DESIGN.md §5 for the conventions this follows.

export type FieldError = { path: string; message: string };

/** RFC 9457 Problem Details, as returned by every failed API call. */
export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  errors: FieldError[];

  constructor(status: number, body: Partial<{ title: string; detail: string; code: string; requestId: string; errors: FieldError[] }>) {
    super(body.detail || body.title || `Request failed (${status})`);
    this.status = status;
    this.code = body.code ?? "unknown";
    this.requestId = body.requestId;
    this.errors = body.errors ?? [];
  }

  fieldError(path: string) {
    return this.errors.find((e) => e.path === path)?.message;
  }
}

export type Page<T> = { data: T[]; nextCursor?: string | null; hasMore?: boolean };

export type Query = Record<string, string | number | boolean | undefined | null>;

export function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

type Options = {
  method?: string;
  body?: unknown;
  query?: Query;
  ifMatch?: number;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

// Listeners notified when the session has ended (401), so the shell can redirect.
const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(fn: () => void) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);
  // Every POST is safe to retry: the API replays the original response for a known key.
  if (method === "POST") headers["Idempotency-Key"] = opts.idempotencyKey ?? crypto.randomUUID();

  const res = await fetch(withQuery(`/api/v1${path}`, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/sign-in")) unauthorizedListeners.forEach((fn) => fn());
    throw new ApiError(res.status, (json as object) ?? { title: res.statusText });
  }
  return json as T;
}

/** URL for a binary download (PDF, CSV export, attachment) through the same proxy. */
export function downloadUrl(path: string, query?: Query) {
  return withQuery(`/api/v1${path}`, query);
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.code === "feature_disabled") return "This feature is turned off.";
    if (err.code === "out_of_reach") return "That's outside the locations or people you can see.";
    if (err.code === "rate_limited") return "Too many requests. Wait a moment and try again.";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
