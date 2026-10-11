import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const SAFE = /^(auto|manual)\/[0-9A-Za-z_-]+\.json$/;

// Baixar um backup. Protegido pelo middleware (cookie de acesso).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("f") ?? "";
  if (!SAFE.test(p)) return new NextResponse("Não encontrado", { status: 404 });
  const { data, error } = await db().storage.from("backups").download(p);
  if (error || !data) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(data.stream(), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="meu-clio-${p.replace("/", "-")}"`, "cache-control": "no-store" },
  });
}
