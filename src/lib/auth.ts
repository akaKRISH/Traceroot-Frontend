const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:4848"}/api/v1`;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function request(path: string, body: Record<string, string>): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | (Partial<AuthSession> & { message?: string })
    | null;

  if (!response.ok || !payload?.accessToken || !payload.user) {
    throw new AuthError(payload?.message ?? "Authentication could not be completed.");
  }
  return { accessToken: payload.accessToken, user: payload.user };
}

export const login = (email: string, password: string) =>
  request("/auth/login", { email, password });

export const register = (name: string, email: string, password: string) =>
  request("/auth/register", { name, email, password });

// The Google Identity Services credential is verified by the backend before a
// TraceRoot session is issued. Never trust or decode it in the browser.
export const loginWithGoogle = (credential: string) => request("/auth/google", { credential });
