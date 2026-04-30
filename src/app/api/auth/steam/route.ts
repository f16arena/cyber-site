import { NextResponse } from "next/server";
import { getSteamLoginUrl } from "@/lib/steam";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = process.env.SITE_URL || `${url.protocol}//${url.host}`;
  const returnTo = `${siteUrl}/api/auth/steam/callback`;
  const realm = siteUrl;

  return NextResponse.redirect(getSteamLoginUrl(returnTo, realm));
}
