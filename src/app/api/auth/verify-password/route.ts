import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// Helper to generate access token hash based on password
export function getAccessAuthToken(password: string): string {
  return crypto.createHash("sha256").update(`snap-auth-${password}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const expectedPassword = process.env.APP_PASSWORD || process.env.ACCESS_PASSWORD;

    // If no password configured in environment, allow access
    if (!expectedPassword || expectedPassword.trim() === "") {
      const response = NextResponse.json({ success: true, message: "Accesso consentito (nessuna password configurata)" });
      response.cookies.set("stp_access_token", "open_access", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return response;
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password mancante." },
        { status: 400 }
      );
    }

    if (password.trim() !== expectedPassword.trim()) {
      return NextResponse.json(
        { success: false, error: "Password non corretta. Riprova." },
        { status: 401 }
      );
    }

    // Password valid: set secure cookie
    const authToken = getAccessAuthToken(expectedPassword.trim());
    const response = NextResponse.json({ success: true });

    response.cookies.set("stp_access_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Errore durante la verifica." },
      { status: 500 }
    );
  }
}
