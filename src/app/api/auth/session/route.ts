import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    // En una implementación real, aquí se verificaría el token con adminAuth.verifyIdToken(idToken)
    // Para simplificar la demo inicial, guardamos el token directamente.
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set("fb-session", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("fb-session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
