import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  steamId?: string;
  username?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "esports_kz_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    id: session.userId,
    steamId: session.steamId,
    username: session.username,
    avatarUrl: session.avatarUrl,
    isAdmin: session.isAdmin ?? false,
  };
}
