/**
 * Rate limiter en memoria (ventana deslizante) para el login.
 *
 * Solo cuentan los intentos FALLIDOS, asi que un login correcto no consume cupo.
 * La clave es `ip:email`: probar una clave mala contra un email inventado no
 * bloquea la cuenta real desde la misma IP.
 *
 * OJO: vive en memoria del proceso. En local es suficiente (un solo proceso);
 * en produccion con varias instancias tendria que ir a un almacen compartido
 * como Redis. Esta declarado en las limitaciones del README.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT ?? 10);

const failures = new Map<string, number[]>();

export function loginKey(req: Request, email: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "local";
  return `${ip}:${email.trim().toLowerCase()}`;
}

/** ¿Esta clave alcanzo el limite? Devuelve tambien cuantos segundos faltan. */
export function isLimited(key: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, hits);

  if (hits.length >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - hits[0])) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false, retryAfter: 0 };
}

export function registerFailure(key: string): void {
  const hits = failures.get(key) ?? [];
  hits.push(Date.now());
  failures.set(key, hits);
}

export function resetFailures(key: string): void {
  failures.delete(key);
}
