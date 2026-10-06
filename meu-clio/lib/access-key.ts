import { scryptSync, timingSafeEqual } from "node:crypto";

// Confere a chave digitada contra ACCESS_KEY_HASH (formato scrypt$salt$hash, base64url).
export function checkAccessKey(input: string): boolean {
  const stored = process.env.ACCESS_KEY_HASH ?? "";
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) throw new Error("ACCESS_KEY_HASH não configurado");
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const got = scryptSync(input.normalize("NFKC"), salt, expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(got, expected);
}
