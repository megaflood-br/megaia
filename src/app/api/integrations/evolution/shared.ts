import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import type { EvolutionConfigLike } from "@/lib/evolution";

export function tenantWebhookUrl(slug: string) {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/api/webhooks/evolution/${slug}`;
}

export async function getTenantEvolution(user: SessionUser) {
  const config = await prisma.evolutionConfig.findUnique({
    where: { tenantId: user.tenantId },
  });
  if (!config) return null;
  const credentials: EvolutionConfigLike = {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    instanceName: config.instanceName,
  };
  return { config, credentials, webhookUrl: tenantWebhookUrl(user.tenant.slug) };
}

export function isConnectedState(state: string) {
  return state === "open";
}
