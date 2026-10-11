import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SAFE = /^(pecas|veiculos)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const TYPE: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Fotos do bucket privado. Protegido pelo middleware (cookie de acesso). O nome do arquivo nunca muda,
// então o navegador pode guardar a imagem para sempre.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p") ?? "";
  if (!SAFE.test(p)) return new NextResponse("Não encontrado", { status: 404 });
  const { data, error } = await db().storage.from("media").download(p);
  if (error || !data) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(data.stream(), {
    headers: { "content-type": TYPE[p.split(".").pop()!], "cache-control": "private, max-age=31536000, immutable" },
  });
}
