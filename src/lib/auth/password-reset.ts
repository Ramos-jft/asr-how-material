import "server-only";

import { createHash } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/env";

const ACCOUNT_RECOVERY_PURPOSE = "account-recovery";
const ACCOUNT_RECOVERY_DURATION = "30m";

type AccountRecoveryTokenPayload = JWTPayload & {
  sub: string;
  email: string;
  purpose: typeof ACCOUNT_RECOVERY_PURPOSE;
  passwordHashFingerprint: string;
};

export type VerifiedPasswordResetToken = {
  userId: string;
  email: string;
  passwordHashFingerprint: string;
};

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

function createPasswordHashFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex");
}

export async function createPasswordResetToken(input: {
  userId: string;
  email: string;
  passwordHash: string;
}): Promise<string> {
  return new SignJWT({
    email: input.email,
    purpose: ACCOUNT_RECOVERY_PURPOSE,
    passwordHashFingerprint: createPasswordHashFingerprint(input.passwordHash),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(ACCOUNT_RECOVERY_DURATION)
    .sign(getJwtSecret());
}

export async function verifyPasswordResetToken(
  token: string,
): Promise<VerifiedPasswordResetToken | null> {
  try {
    const verified = await jwtVerify<AccountRecoveryTokenPayload>(
      token,
      getJwtSecret(),
    );

    const payload = verified.payload;

    if (
      !payload.sub ||
      payload.purpose !== ACCOUNT_RECOVERY_PURPOSE ||
      typeof payload.email !== "string" ||
      typeof payload.passwordHashFingerprint !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      passwordHashFingerprint: payload.passwordHashFingerprint,
    };
  } catch {
    return null;
  }
}

export function isPasswordResetTokenValidForUser(
  token: VerifiedPasswordResetToken,
  user: {
    id: string;
    email: string;
    passwordHash: string;
  },
): boolean {
  return (
    token.userId === user.id &&
    token.email.toLowerCase() === user.email.toLowerCase() &&
    token.passwordHashFingerprint ===
      createPasswordHashFingerprint(user.passwordHash)
  );
}
