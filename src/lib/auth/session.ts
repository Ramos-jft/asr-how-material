import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "asr_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type SessionPayload = JWTPayload & {
  sub: string;
  roles: string[];
  permissions: string[];
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET ausente ou inválido. Defina pelo menos 32 caracteres no ambiente.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(input: {
  userId: string;
  roles: string[];
  permissions: string[];
}): Promise<void> {
  const token = await new SignJWT({
    roles: input.roles,
    permissions: input.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret());

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify<SessionPayload>(token, getJwtSecret());
    return verified.payload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
