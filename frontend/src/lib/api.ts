const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

/**
 * Called by UserProvider on mount to wire up Clerk's getToken function.
 */
export function setTokenGetter(fn: TokenGetter) {
  tokenGetter = fn;
}

/**
 * Authenticated fetch helper.
 * Gets a fresh Clerk JWT per request and sets Authorization: Bearer header.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;

  const headers = new Headers(options.headers);

  // Get fresh Clerk JWT
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Ensure JSON content type for non-FormData requests
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
