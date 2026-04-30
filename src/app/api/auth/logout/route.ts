import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  session.destroy();
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/", url.origin), 303);
}

export async function GET(request: Request) {
  return POST(request);
}
