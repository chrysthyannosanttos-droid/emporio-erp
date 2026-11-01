import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getMobilePdvAccess } from "@/actions/mobilePdv";
import { MobilePdvClient } from "./MobilePdvClient";

export const metadata: Metadata = {
  title: "PDV Mobile — Cybertech RP",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default async function MobilePdvPage() {
  const access = await getMobilePdvAccess();

  if (!access.allowed) {
    return (
      <main className="fixed inset-0 bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-7 max-w-sm w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-lg font-bold text-slate-900">PDV Mobile indisponível</h1>
          <p className="text-sm text-slate-700 leading-relaxed">{access.reason}</p>
          <Link
            href="/"
            className="block w-full rounded-xl bg-slate-900 text-white font-bold py-3 text-base"
          >
            Voltar ao sistema
          </Link>
        </div>
      </main>
    );
  }

  return (
    <MobilePdvClient
      userName={access.userName || "Operador"}
      companyName={access.companyName || "Cybertech RP"}
      canDiscountLimited={!!access.canDiscountLimited}
      canDiscountUnlimited={!!access.canDiscountUnlimited}
    />
  );
}

