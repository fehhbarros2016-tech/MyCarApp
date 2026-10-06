// Gera o ACCESS_KEY_HASH a partir da chave de acesso digitada.
// Uso: npm run chave   (a chave é pedida no terminal e não aparece no histórico)
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.stdoutMuted = true;
rl._writeToOutput = (s) => { if (!rl.stdoutMuted) rl.output.write(s); };
process.stdout.write("Digite a chave de acesso: ");
rl.question("", (key) => {
  rl.close();
  process.stdout.write("\n");
  if (!key || key.length < 6) {
    console.error("A chave precisa ter pelo menos 6 caracteres.");
    process.exit(1);
  }
  const salt = randomBytes(16);
  const hash = scryptSync(key.normalize("NFKC"), salt, 32, { N: 16384, r: 8, p: 1 });
  console.log(`\nACCESS_KEY_HASH=scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}\n`);
});
