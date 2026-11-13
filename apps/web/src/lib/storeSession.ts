import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET_KEY || "super_secret_dev_key_only_for_local_use";
const encodedKey = new TextEncoder().encode(secretKey);

const STORE_COOKIE_NAME = "emporio_store_customer";

export type StoreCustomerSession = {
  customerId: string;
  companyId: string;
  name: string;
  email?: string;
};

export async function createStoreCustomerSession(payload: StoreCustomerSession) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set(STORE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL === "1",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getStoreCustomerSession(): Promise<StoreCustomerSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STORE_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, encodedKey, {
      algorithms: ["HS256"],
    });
    if (!payload?.customerId || !payload?.companyId) return null;
    return payload as StoreCustomerSession;
  } catch {
    return null;
  }
}

export async function deleteStoreCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STORE_COOKIE_NAME);
}

