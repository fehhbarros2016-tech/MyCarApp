// Bloqueia migrations destrutivas sem aprovação explícita.
// Uma migration só pode conter DROP/TRUNCATE/DELETE sem WHERE se tiver a linha:
//   -- DESTRUTIVO: aprovado por Gabriel em AAAA-MM-DD
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const risky = [/\bdrop\s+(table|schema|column|view|type)\b/i, /\btruncate\b/i, /\bdelete\s+from\s+\w+\s*;/i, /\balter\s+table\s+\w+\s+drop\b/i];
let failed = false;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = readFileSync(join(dir, f), "utf8");
  const code = sql.replace(/--.*$/gm, "");
  const hit = risky.find((r) => r.test(code));
  if (hit && !/--\s*DESTRUTIVO:\s*aprovado por .+ em \d{4}-\d{2}-\d{2}/i.test(sql)) {
    console.error(`✗ ${f}: operação destrutiva sem aprovação (${hit})`);
    failed = true;
  } else console.log(`✓ ${f}`);
}
process.exit(failed ? 1 : 0);
