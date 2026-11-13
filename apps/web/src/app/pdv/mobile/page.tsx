import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
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

  if (access.unauthenticated) {
    redirect("/login");
  }

  // Se o usuário já tem o app instalado apontando para /pdv/mobile, mas não possui permissão pdv.mobile,
  // abre o sistema normal automaticamente sem precisar reinstalar o aplicativo no celular.
  if (!access.allowed) {
    redirect("/");
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

