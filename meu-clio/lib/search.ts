// Busca que entende pedaços, erros de digitação e falta de acento: "comb", "conbustivel", "oleo", "pedagio".
import { editDistance, isSubsequence, norm } from "@/lib/text";

export type SearchDoc = {
  id: string; date: string; amount: number; title: string; sub: string; catId: string; extra?: string;
};
export type SearchCat = { id: string; name: string; slug: string };

// palavras que levam a uma categoria (pelo slug) ou a outros termos
const SYNONYMS: Record<string, string[]> = {
  gas: ["combustivel", "gasolina"], gasolina: ["combustivel"], alcool: ["etanol", "combustivel"], etanol: ["combustivel"],
  posto: ["combustivel"], abastec: ["combustivel"], litro: ["combustivel"], comb: ["combustivel"],
  oficina: ["manutencao"], mecanico: ["manutencao"], conserto: ["manutencao"], servico: ["manutencao"],
  doc: ["documentacao"], detran: ["documentacao", "licenciamento", "ipva"], crlv: ["licenciamento"],
  lava: ["lavagem"], lavar: ["lavagem"], limpeza: ["lavagem", "estetica"],
  estac: ["estacionamento"], vaga: ["estacionamento"], zona: ["estacionamento"],
  pedagio: ["pedagio"], sem_parar: ["pedagio"], tag: ["pedagio"],
  peca: ["pecas"], financ: ["parcelas"], prestacao: ["parcelas"], parcela: ["parcelas"],
  reboque: ["guincho"], socorro: ["guincho"], apolice: ["seguro"],
};
const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function words(...parts: (string | null | undefined)[]) {
  return norm(parts.filter(Boolean).join(" ")).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Nota de 0 a 10 para um termo contra uma palavra. */
export function termScore(t: string, w: string): number {
  if (!t || !w) return 0;
  if (w === t) return 10;
  if (w.startsWith(t)) return t.length >= 2 ? 8 : 3;
  if (t.length >= 3 && w.includes(t)) return 5;
  if (t.length >= 4) {
    const head = w.slice(0, t.length);
    if (editDistance(t, head, 1) <= 1 || editDistance(t, w, 2) <= (t.length >= 7 ? 2 : 1)) return 4;
  }
  if (t.length >= 3 && t[0] === w[0] && isSubsequence(t, w)) return 2;
  return 0;
}

function expand(t: string): string[] {
  const alts = new Set([t]);
  for (const [k, v] of Object.entries(SYNONYMS)) if (k.startsWith(t) || (t.length >= 3 && t.startsWith(k))) v.forEach((x) => alts.add(x));
  return [...alts];
}

const best = (alts: string[], ws: string[]) => {
  let b = 0;
  for (const a of alts) for (const w of ws) { const sc = termScore(a, w); if (sc > b) b = sc; if (b === 10) return b; }
  return b;
};

export type CatHit = { cat: SearchCat; score: number };
export type DocHit = { doc: SearchDoc; score: number };

export function search(query: string, docs: SearchDoc[], cats: SearchCat[], limit = 80): { cats: CatHit[]; docs: DocHit[] } {
  const q = norm(query);
  if (!q) return { cats: [], docs: [] };
  const terms = q.split(" ").filter(Boolean);
  const catWords = new Map(cats.map((c) => [c.id, [...words(c.name), norm(c.slug)]]));

  const catHits: CatHit[] = [];
  for (const c of cats) {
    const ws = catWords.get(c.id)!;
    let total = 0;
    for (const t of terms) { const sc = best(expand(t), ws); if (!sc) { total = 0; break; } total += sc; }
    if (total) catHits.push({ cat: c, score: total });
  }

  const docHits: DocHit[] = [];
  for (const d of docs) {
    const [y, m, day] = d.date.split("-");
    const ws = [...words(d.title, d.sub, d.extra), ...(catWords.get(d.catId) ?? []), MONTHS[Number(m) - 1], y];
    const amountTxt = [String(Math.round(d.amount)), d.amount.toFixed(2).replace(".", ","), d.amount.toFixed(2)];
    let total = 0;
    for (const t of terms) {
      let sc = best(expand(t), ws);
      if (/^\d/.test(t)) {
        if (amountTxt.some((a) => a.startsWith(t.replace(".", ",")))) sc = Math.max(sc, 7);
        if (t.includes("/")) { const [dd, mm] = t.split("/"); if (Number(dd) === Number(day) && (!mm || Number(mm) === Number(m))) sc = Math.max(sc, 7); }
      }
      if (!sc) { total = 0; break; }
      total += sc;
    }
    if (total) docHits.push({ doc: d, score: total });
  }
  catHits.sort((a, b) => b.score - a.score);
  docHits.sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date));
  return { cats: catHits.slice(0, 6), docs: docHits.slice(0, limit) };
}
