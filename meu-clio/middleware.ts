import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Toda página exige o cookie de acesso, exceto a tela de boas-vindas e os arquivos públicos.
export async function middleware(req: NextRequest) {
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isWelcome = req.nextUrl.pathname.startsWith("/bem-vindo");
  if (ok && isWelcome) return NextResponse.redirect(new URL("/", req.url));
  if (ok || isWelcome) return NextResponse.next();
  return NextResponse.redirect(new URL("/bem-vindo", req.url));
}

export const config = {
  matcher: ["/((?!_next/|icons/|car/|manifest.webmanifest|favicon.ico|robots.txt).*)"],
};
