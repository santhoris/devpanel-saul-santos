"use client";

/**
 * Cliente HTTP del frontend.
 * - Inyecta el Bearer token guardado en localStorage.
 * - Intercepta 401: limpia la sesion y manda al login (manejo de token vencido).
 */
const TOKEN_KEY = "devpanel_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers, cache: "no-store" });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError("Tu sesion expiro. Vuelve a iniciar sesion.", 401);
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* respuesta sin JSON: nos quedamos con el mensaje generico */
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}
