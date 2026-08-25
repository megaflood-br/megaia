import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AgentsManager } from "./agents-manager";

export default async function AgentsPage() {
  const user = await requireUser();
  const agents = await prisma.agent.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Agentes</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Avatar, personalidade, modelo OpenAI e regras de handoff.
        </p>
      </header>
      <AgentsManager initialAgents={agents} />
    </div>
  );
}
