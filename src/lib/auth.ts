import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "ajaia_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-change-me-in-production-min-32-chars";
const encodedKey = new TextEncoder().encode(SESSION_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId === "string" && typeof payload.email === "string") {
      return {
        userId: payload.userId,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, email: string): Promise<void> {
  const token = await signSessionToken({ userId, email });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Server-side helper that retrieves the verified user and checks the DB
 * to ensure the user still exists on every protected request.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const payload = await getSessionPayload();
  if (!payload?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      // If user no longer exists in DB, invalidate session
      await clearSession();
      return null;
    }

    return user;
  } catch (error) {
    console.error("Failed to fetch user from DB in getCurrentUser:", error);
    return null;
  }
}

