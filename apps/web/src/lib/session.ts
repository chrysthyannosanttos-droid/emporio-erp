import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const secretKey = process.env.JWT_SECRET_KEY || "super_secret_dev_key_only_for_local_use";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  name: string;
  email?: string;
  role: string;
  companyId?: string;
  companyName?: string;
  isSuperAdmin?: boolean;
  sessionToken?: string;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt(payload);

  let cookieDomain: string | undefined = undefined;
  try {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "";
    if (host.includes("cybertechapp.com.br")) {
      cookieDomain = ".cybertechapp.com.br";
    }
  } catch {}

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || !!cookieDomain,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
});

export async function updateSession() {
  const session = (await cookies()).get("session")?.value;
  const payload = await decrypt(session);

  if (!session || !payload) {
    return null;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  let cookieDomain: string | undefined = undefined;
  try {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "";
    if (host.includes("cybertechapp.com.br")) {
      cookieDomain = ".cybertechapp.com.br";
    }
  } catch {}

  const cookieStore = await cookies();
  cookieStore.delete("session");
  if (cookieDomain) {
    try {
      cookieStore.set("session", "", {
        domain: cookieDomain,
        path: "/",
        expires: new Date(0),
      });
    } catch {}
  }
}
