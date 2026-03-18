import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("fb-session")?.value;
  const { pathname } = request.nextUrl;

  // Si no hay sesión y no está en login o seed, redirigir a login
  if (!session && pathname !== "/login" && pathname !== "/seed") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay sesión y está en login, redirigir al home (o POS)
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  // Permitir pasar el resto de las rutas (el role-based se puede manejar en server components o layouts)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
