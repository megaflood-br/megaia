import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ConversationActions } from "./actions";

type Props = { params: Promise<{ id: string }> };

export default async function ConversationDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      agent: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/conversations"
            className="text-sm font-semibold text-[var(--teal)]"
          >
            ← Conversas
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {conversation.contactName ||
              conversation.contactPhone ||
              "Conversa"}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]/60">
            {conversation.agent.avatarEmoji} {conversation.agent.name} ·{" "}
            {conversation.channel} · {conversation.status}
          </p>
          {conversation.status === "handoff" && (
            <p className="mt-2 max-w-xl text-sm text-amber-800">
              IA pausada. Respostas enviadas por você no WhatsApp entram como
              atendente. Use Reabrir / IA para a IA voltar a responder.
            </p>
          )}
        </div>
        <ConversationActions
          id={conversation.id}
          status={conversation.status}
        />
      </div>

      <div className="surface space-y-3 p-5">
        {conversation.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--ink)] text-white"
                : m.role === "human"
                  ? "bg-amber-50"
                  : "bg-[var(--sand)]"
            }`}
          >
            <p className="mb-1 text-[10px] uppercase tracking-wide opacity-60">
              {m.role === "user"
                ? "Cliente"
                : m.role === "human"
                  ? "Atendente"
                  : m.role === "assistant"
                    ? "Agente"
                    : m.role}
            </p>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
