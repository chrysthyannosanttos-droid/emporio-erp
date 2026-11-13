import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ContractGeneratorPage from "./ContractsClient";

export default async function ContractsPage() {
  const session = await getSession();
  const isCristiano =
    Boolean(session?.isSuperAdmin) ||
    session?.name?.toLowerCase().includes("cristiano") ||
    Boolean(session?.email?.toLowerCase().includes("cristiano"));

  if (!isCristiano) {
    redirect("/");
  }

  return <ContractGeneratorPage />;
}

