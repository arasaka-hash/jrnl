import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "jrnl_auth";
const PIN = process.env.APP_PIN ?? "4414";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body ?? {};

    if (String(pin) === PIN) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(AUTH_COOKIE, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      return res;
    }

    return NextResponse.json({ ok: false, error: "Invalid PIN" }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
