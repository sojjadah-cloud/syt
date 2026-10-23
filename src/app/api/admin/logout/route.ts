import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Relative redirect: behind a proxy the request URL is the internal address.
export async function POST() {
  const res = new NextResponse(null, { status: 303, headers: { Location: "/admin/login" } });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
