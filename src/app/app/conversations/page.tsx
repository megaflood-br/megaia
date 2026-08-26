import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relativeTime } from "@/lib/utils";

type Props = { searchParams: Promise<{ tab?: string }> };

const TABS = [
  { id: "inbox", label: "Fila", status: "handoff" as const },
  { id: "open", label: "Com a IA", status: "open" as const },
  { id: "closed", label: "Encerradas", status: "closed" as const },
  { id: "all", label: "Todas", status: undefined },
];

export default async function ConversationsPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = TABS.some((t) => t.id === params.tab) ? params.tab! : "inbox";
  const current = TABS.find((t) => t.id === tab)!;

  const [conversations, counts] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(current.status ? { status: current.status } : {}),
      },
      include: {
        agent: { select: { name: true, avatarEmoji: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    }),
    prisma.conversation.groupBy({
      by: ["status"],
      where: { tenantId: user.tenantId },
      _count: true,
    }),
  ]);

  const countBy = Object.fromEntries(
    counts.map((c) => [c.status, c._count])
  ) as Record<string, number>;
  const total = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Inbox</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Atenda o cliente por aqui. A resposta vai para o WhatsApp e a IA
          pausa.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n =
            t.id === "all"
              ? total
              : t.status
                ? countBy[t.status] || 0
                : 0;
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={t.id === "inbox" ? "/app/conversations" : `/app/conversations?tab=${t.id}`}
              className={`btn ${active ? "btn-primary" : "btn-ghost"}`}
            >
              {t.label}
              <span className="ml-1 opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>

      <div className="surface divide-y divide-[var(--line)]">
        {conversations.length === 0 && (
          <p className="p-6 text-sm text-[var(--ink-soft)]/60">
            {tab === "inbox"
              ? "Nenhuma conversa na fila. Quando a IA transferir ou você responder, elas aparecem aqui."
              : "Nenhuma conversa neste filtro."}
          </p>
        )}
        {conversations.map((c) => {
          const last = c.messages[0];
          const waiting = last?.role === "user";
          return (
            <Link
              key={c.id}
              href={`/app/conversations/${c.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--sand)]/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {c.agent.avatarEmoji}{" "}
                  {c.contactName || c.contactPhone || "Contato"}
                </p>
                <p className="truncate text-sm text-[var(--ink-soft)]/60">
                  via {c.channel} · {last?.content || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.status === "handoff"
                      ? "bg-amber-100 text-[var(--warn)]"
                      : c.status === "closed"
                        ? "bg-[var(--sand)] text-[var(--ink-soft)]"
                        : "bg-[var(--mint-soft)] text-[var(--teal-deep)]"
                  }`}
                >
                  {waiting && c.status !== "closed" ? "aguardando" : c.status}
                </span>
                <p className="mt-1 text-xs text-[var(--ink-soft)]/45">
                  {relativeTime(c.lastMessageAt)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
