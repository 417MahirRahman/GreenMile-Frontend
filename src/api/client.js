import { auth } from "../firebase/firebase";
export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = "ApiError"; this.status = status; }
}
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
// Backend origins need the API prefix; existing URLs with a path remain valid.
const baseUrl = /^https?:\/\/[^/]+$/i.test(configuredBaseUrl) ? `${configuredBaseUrl}/api` : configuredBaseUrl;
export async function request(path, { method = "GET", body, signal, user = auth.currentUser } = {}) {
  signal?.throwIfAborted();
  if (!user) throw new ApiError("Please sign in to continue.", 401);
  // Firebase refreshes expired tokens; never persist bearer tokens in app state.
  const token = await user.getIdToken();
  signal?.throwIfAborted();
  if (auth.currentUser?.uid !== user.uid) throw new DOMException("Account changed", "AbortError");
  const response = await fetch(`${baseUrl}${path}`, { method, signal,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new ApiError("The server returned an unreadable response.", response.status); }
  signal?.throwIfAborted();
  if (auth.currentUser?.uid !== user.uid) throw new DOMException("Account changed", "AbortError");
  if (!response.ok) throw new ApiError(result.message || `Request failed (${response.status}).`, response.status);
  return result.data;
}
