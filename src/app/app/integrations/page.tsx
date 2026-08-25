import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EvolutionForm } from "./evolution-form";

export default async function IntegrationsPage() {
  const user = await requireUser();
  const config = await prisma.evolutionConfig.findUnique({
    where: { tenantId: user.tenantId },
  });

  const safe = config
    ? {
        ...config,
        apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "",
        webhookUrl: `${process.env.APP_URL || "http://localhost:3000"}/api/webhooks/evolution/${user.tenant.slug}`,
      }
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Integrações</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Evolution API com QR Code no painel, WhatsApp e OpenAI.
        </p>
      </header>
      <EvolutionForm
        initial={safe}
        tenantSlug={user.tenant.slug}
        appUrl={process.env.APP_URL || "http://localhost:3000"}
      />
    </div>
  );
}
