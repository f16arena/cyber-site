import { NextResponse } from "next/server";
import { getSteamLoginUrl } from "@/lib/steam";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // 10 попыток логина в минуту с одного IP — анти-флуд
  const limit = rateLimit(getClientKey(request), 10, 60_000);
  if (!limit.allowed) {
    return new Response("Too many login attempts. Try again in a minute.", {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(limit.resetMs / 1000).toString(),
      },
    });
  }

  const url = new URL(request.url);
  const siteUrl = process.env.SITE_URL || `${url.protocol}//${url.host}`;
  const returnTo = `${siteUrl}/api/auth/steam/callback`;
  const realm = siteUrl;

  return NextResponse.redirect(getSteamLoginUrl(returnTo, realm));
}
