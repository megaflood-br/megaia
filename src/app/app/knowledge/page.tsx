import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KnowledgeManager } from "./knowledge-manager";

export default async function KnowledgePage() {
  const user = await requireUser();
  const items = await prisma.knowledgeItem.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Conhecimento</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          FAQs, políticas e processos que o agente consulta nas respostas.
        </p>
      </header>
      <KnowledgeManager initial={items} />
    </div>
  );
}
