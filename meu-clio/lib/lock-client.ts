// Bloqueio com Face ID / Touch ID (WebAuthn) neste aparelho. Roda só no navegador.
// A credencial fica no próprio aparelho (chave guardada pelo iOS); o app guarda só o id dela.
const KEY = "mc_lock_cred";
const COOKIE = "mc_lock";

const b64u = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const rand = (n = 32) => crypto.getRandomValues(new Uint8Array(n));

export function lockCredential(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function lockEnabled(): boolean {
  return Boolean(lockCredential()) && document.cookie.split("; ").includes(`${COOKIE}=1`);
}

export async function lockSupported(): Promise<boolean> {
  try {
    return Boolean(window.PublicKeyCredential) && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function enableLock(name: string): Promise<void> {
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: "Meu Clio", id: location.hostname },
      user: { id: rand(16), name: "meu-clio", displayName: name || "Meu Clio" },
      challenge: rand(),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000, attestation: "none",
    },
  }) as PublicKeyCredential | null;
  if (!cred) throw new Error("cancelado");
  localStorage.setItem(KEY, b64u(cred.rawId));
  document.cookie = `${COOKIE}=1; path=/; max-age=${400 * 86400}; samesite=lax; secure`;
  window.dispatchEvent(new Event("mc-lock-change"));
}

/** Pede o Face ID. true = conferiu. */
export async function verifyLock(): Promise<boolean> {
  const id = lockCredential();
  if (!id) return true;
  const got = await navigator.credentials.get({
    publicKey: {
      challenge: rand(), rpId: location.hostname, userVerification: "required", timeout: 60_000,
      allowCredentials: [{ type: "public-key", id: fromB64u(id), transports: ["internal"] }],
    },
  });
  return Boolean(got);
}

export function disableLock() {
  try { localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax; secure`;
  window.dispatchEvent(new Event("mc-lock-change"));
}
