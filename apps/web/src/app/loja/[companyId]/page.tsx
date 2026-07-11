import { getPublicCompany } from "@/actions/company";
import { notFound } from "next/navigation";
import { Package, MapPin, Phone, Star } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const { company } = await getPublicCompany(companyId);
  if (!company) return { title: "Loja não encontrada" };
  return {
    title: `${company.name} — Catálogo Online`,
    description: `Confira os produtos disponíveis em ${company.name}`,
  };
}

export default async function PublicStorePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const { company } = await getPublicCompany(companyId);

  if (!company) notFound();

  const primaryColor = company.theme?.corPrimaria || "#6366f1";
  const logo = company.theme?.logoPrincipal;
  const city = company.fiscalConfig?.city;
  const state = company.fiscalConfig?.state;
  const tradeName = company.fiscalConfig?.tradeName || company.name;

  return (
    <div style={{ minHeight: "100vh", background: "#060818", fontFamily: "system-ui, sans-serif" }}>

      {/* Hero Header */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}22 0%, #060818 60%)`,
        borderBottom: `1px solid ${primaryColor}20`,
        padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Logo or initial */}
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={company.name} style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover" }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: 16,
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 900, color: "#fff",
                boxShadow: `0 8px 32px ${primaryColor}44`,
              }}>
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
                {tradeName}
              </h1>
              {(city || state) && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, color: "#64748b" }}>
                  <MapPin size={13} />
                  <span style={{ fontSize: 13 }}>{[city, state].filter(Boolean).join(" — ")}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{
                  background: `${primaryColor}20`, border: `1px solid ${primaryColor}40`,
                  borderRadius: 20, padding: "3px 12px",
                  color: primaryColor, fontSize: 12, fontWeight: 600,
                }}>
                  ✓ Loja Verificada
                </span>
                <span style={{
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: 20, padding: "3px 12px",
                  color: "#4ade80", fontSize: 12, fontWeight: 600,
                }}>
                  {company.products.length} produto{company.products.length !== 1 ? "s" : ""} disponíve{company.products.length !== 1 ? "is" : "l"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products section */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {company.products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
            <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontSize: 16, margin: 0 }}>Nenhum produto disponível no momento.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Volte em breve!</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>
                🛒 Nossos Produtos
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}>
              {company.products.map((product) => (
                <div key={product.id} style={{
                  background: "#0f1123",
                  border: "1px solid rgba(99,102,241,0.1)",
                  borderRadius: 14,
                  padding: 18,
                  transition: "all 0.2s",
                  cursor: "default",
                }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${primaryColor}40`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${primaryColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.1)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* Product initial / icon */}
                  <div style={{
                    width: "100%", height: 90,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)`,
                    border: `1px solid ${primaryColor}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 14,
                    fontSize: 28,
                  }}>
                    🛍️
                  </div>

                  {product.category && (
                    <div style={{ color: "#475569", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
                      {product.category.name}
                    </div>
                  )}
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.35 }}>
                    {product.name}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>R$</span>
                    <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>
                      {Number(product.price).toFixed(2).replace(".", ",")}
                    </span>
                    <span style={{ color: "#475569", fontSize: 11 }}>/{product.unit}</span>
                  </div>

                  <div style={{
                    marginTop: 10,
                    background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
                    borderRadius: 6, padding: "4px 8px",
                    color: "#4ade80", fontSize: 11, fontWeight: 600,
                    display: "inline-block",
                  }}>
                    ✓ Em estoque
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(99,102,241,0.08)",
        padding: "24px",
        textAlign: "center",
      }}>
        <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>
          Vitrine gerada pelo{" "}
          <span style={{ color: primaryColor, fontWeight: 600 }}>Empório ERP</span>
          {" "}· {company.name}
        </p>
      </footer>
    </div>
  );
}
