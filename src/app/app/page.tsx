import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const tenantId = user.tenantId;

  const [agents, knowledge, products, services, conversations, openCount, contacts] =
    await Promise.all([
      prisma.agent.count({ where: { tenantId } }),
      prisma.knowledgeItem.count({ where: { tenantId, isActive: true } }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.service.count({ where: { tenantId, isActive: true } }),
      prisma.conversation.findMany({
        where: { tenantId },
        include: {
          agent: { select: { name: true, avatarEmoji: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
      }),
      prisma.conversation.count({
        where: { tenantId, status: { in: ["open", "handoff"] } },
      }),
      prisma.contact.count({ where: { tenantId } }),
    ]);

  const stats = [
    { label: "Agentes", value: agents, href: "/app/agents" },
    { label: "Itens de conhecimento", value: knowledge, href: "/app/knowledge" },
    {
      label: "Produtos + serviços",
      value: products + services,
      href: "/app/catalog",
    },
    { label: "Conversas ativas", value: openCount, href: "/app/conversations" },
    { label: "Contatos CRM", value: contacts, href: "/app/crm" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-[var(--ink-soft)]/60">Workspace</p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Olá, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-soft)]/75">
          Configure o agente, alimente a base da empresa e conecte o WhatsApp.
          O Nexo usa esses dados no contexto da OpenAI a cada mensagem.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="surface block p-5 transition hover:border-[var(--mint)]"
          >
            <p className="text-sm text-[var(--ink-soft)]/60">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{s.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-6">
          <h2 className="font-display text-xl font-semibold">Próximos passos</h2>
          <ol className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
            <li>
              1.{" "}
              <Link href="/app/company" className="font-semibold text-[var(--teal)]">
                Complete os dados da empresa
              </Link>
            </li>
            <li>
              2.{" "}
              <Link href="/app/catalog" className="font-semibold text-[var(--teal)]">
                Cadastre preços de produtos e serviços
              </Link>
            </li>
            <li>
              3.{" "}
              <Link href="/app/agents" className="font-semibold text-[var(--teal)]">
                Personalize avatar e personalidade do agente
              </Link>
            </li>
            <li>
              4.{" "}
              <Link
                href="/app/integrations"
                className="font-semibold text-[var(--teal)]"
              >
                Conecte Evolution API (WhatsApp)
              </Link>
            </li>
          </ol>
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Conversas recentes</h2>
            <Link
              href="/app/conversations"
              className="text-sm font-semibold text-[var(--teal)]"
            >
              Ver todas
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {conversations.length === 0 && (
              <p className="text-sm text-[var(--ink-soft)]/60">
                Nenhuma conversa ainda. Teste o agente na página de Agentes.
              </p>
            )}
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/app/conversations/${c.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-transparent px-2 py-2 hover:border-[var(--line)] hover:bg-[var(--sand)]/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {c.agent.avatarEmoji} {c.contactName || c.contactPhone || "Contato"}
                  </p>
                  <p className="truncate text-sm text-[var(--ink-soft)]/60">
                    {c.messages[0]?.content || "Sem mensagens"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--ink-soft)]/45">
                  {relativeTime(c.lastMessageAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
