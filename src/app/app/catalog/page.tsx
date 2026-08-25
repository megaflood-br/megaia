import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CatalogManager } from "./catalog-manager";

export default async function CatalogPage() {
  const user = await requireUser();
  const [products, services] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Catálogo</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Tabela de preços de serviços e produtos para o agente consultar.
        </p>
      </header>
      <CatalogManager initialProducts={products} initialServices={services} />
    </div>
  );
}
