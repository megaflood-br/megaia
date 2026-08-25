import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CompanyForm } from "./company-form";

export default async function CompanyPage() {
  const user = await requireUser();
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: user.tenantId },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Empresa</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Dados institucionais consultados pelo agente em cada conversa.
        </p>
      </header>
      <CompanyForm initial={profile} />
    </div>
  );
}
