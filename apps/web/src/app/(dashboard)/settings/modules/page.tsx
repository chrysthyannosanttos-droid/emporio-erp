import { getCompanyModulesConfig } from "@/actions/modules";
import { getTenantCompanyInfo } from "@/actions/company";
import { ModulesManager } from "./ModulesManager";

export default async function SettingsModulesPage() {
  const [{ companyName, operationTypes, activeModules, allModules }, { company }] = await Promise.all([
    getCompanyModulesConfig(),
    getTenantCompanyInfo(),
  ]);

  return (
    <ModulesManager
      companyData={{
        id: company?.id || "",
        name: company?.name || companyName || "Sua Empresa",
        document: company?.document || "",
        segment: company?.segment || "SUPERMARKET",
        tradeName: company?.fiscalConfig?.tradeName || company?.name || "",
        ie: company?.fiscalConfig?.ie || "",
        im: company?.fiscalConfig?.im || "",
        taxRegime: company?.fiscalConfig?.taxRegime || "SN",
        environment: company?.fiscalConfig?.environment || "homologacao",
        street: company?.fiscalConfig?.street || "",
        number: company?.fiscalConfig?.number || "",
        district: company?.fiscalConfig?.district || "",
        city: company?.fiscalConfig?.city || "",
        state: company?.fiscalConfig?.state || "AL",
        zipCode: company?.fiscalConfig?.zipCode || "",
      }}
      initialOperationTypes={operationTypes || ["RETAIL"]}
      initialActiveModules={activeModules || []}
      allModules={allModules || []}
    />
  );
}
