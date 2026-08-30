import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const expectedPassword = process.env.APP_PASSWORD || process.env.ACCESS_PASSWORD;

  // If no password set in env, protection is disabled
  if (!expectedPassword || expectedPassword.trim() === "") {
    return NextResponse.json({ isProtected: false, isAuthorized: true });
  }

  const cookieToken = request.cookies.get("stp_access_token")?.value;
  const expectedToken = crypto
    .createHash("sha256")
    .update(`snap-auth-${expectedPassword.trim()}`)
    .digest("hex");

  const isAuthorized = cookieToken === expectedToken;

  return NextResponse.json({
    isProtected: true,
    isAuthorized,
  });
}
