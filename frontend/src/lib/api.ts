const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const STORAGE_KEY = "tessera_user";

/**
 * Authenticated fetch helper.
 * Reads user ID from localStorage and attaches x-user-id header.
 * Will switch to Bearer token auth once Supabase SMTP is configured.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;

  const headers = new Headers(options.headers);

  // Get user ID from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.id) {
        headers.set("x-user-id", user.id);
      }
    }
  } catch {
    // ignore parse errors
  }

  // Ensure JSON content type for non-FormData requests
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
