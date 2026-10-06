// Cookie de acesso assinado (HMAC-SHA256). Funciona no Edge (middleware) e no Node.
// Formato: v1.<emitidoEmSegundos>.<assinatura>
export const SESSION_COOKIE = "mc_acesso";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) throw new Error("SESSION_SECRET ausente ou curto demais");
  return s;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const body = `v1.${Math.floor(now / 1000)}`;
  return `${body}.${await hmac(body, secret())}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const issued = Number(parts[1]);
  if (!Number.isFinite(issued) || now / 1000 - issued > SESSION_MAX_AGE) return false;
  let expected: string;
  try { expected = await hmac(`${parts[0]}.${parts[1]}`, secret()); } catch { return false; }
  if (expected.length !== parts[2].length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i);
  return diff === 0;
}
