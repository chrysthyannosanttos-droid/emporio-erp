import { NextResponse } from "next/server";
import { validateActiveSession } from "@/actions/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await validateActiveSession();
  return NextResponse.json(result);
}

