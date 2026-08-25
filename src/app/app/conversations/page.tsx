import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relativeTime } from "@/lib/utils";

export default async function ConversationsPage() {
  const user = await requireUser();
  const conversations = await prisma.conversation.findMany({
    where: { tenantId: user.tenantId },
    include: {
      agent: { select: { name: true, avatarEmoji: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Conversas</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Histórico de WhatsApp e testes do painel.
        </p>
      </header>

      <div className="surface divide-y divide-[var(--line)]">
        {conversations.length === 0 && (
          <p className="p-6 text-sm text-[var(--ink-soft)]/60">
            Nenhuma conversa ainda.
          </p>
        )}
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/app/conversations/${c.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--sand)]/40"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {c.agent.avatarEmoji} {c.contactName || c.contactPhone || "Contato"}
              </p>
              <p className="truncate text-sm text-[var(--ink-soft)]/60">
                via {c.channel} · {c.messages[0]?.content || "—"}
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
                {c.status}
              </span>
              <p className="mt-1 text-xs text-[var(--ink-soft)]/45">
                {relativeTime(c.lastMessageAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
