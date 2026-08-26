import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contactToDto } from "@/lib/crm";
import { relativeTime } from "@/lib/utils";
import { ContactDetail } from "./detail";

type Props = { params: Promise<{ id: string }> };

export default async function ContactPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      conversations: {
        include: {
          agent: { select: { name: true, avatarEmoji: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 50,
      },
    },
  });

  if (!contact) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/crm" className="text-sm font-semibold text-[var(--teal)]">
          ← CRM
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {contact.name || "Contato"}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]/60">
          {contact.conversations.length} conversa(s) vinculada(s)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <ContactDetail initial={contactToDto(contact)} />
        <div className="surface divide-y divide-[var(--line)]">
          <div className="px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Conversas</h2>
          </div>
          {contact.conversations.length === 0 && (
            <p className="p-5 text-sm text-[var(--ink-soft)]/60">
              Nenhuma conversa ainda. Quando este telefone escrever no WhatsApp,
              a ficha entra automaticamente no inbox.
            </p>
          )}
          {contact.conversations.map((c) => (
            <Link
              key={c.id}
              href={`/app/conversations/${c.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--sand)]/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {c.agent.avatarEmoji} {c.agent.name} · {c.channel}
                </p>
                <p className="truncate text-sm text-[var(--ink-soft)]/60">
                  {c.messages[0]?.content || "Sem mensagens"}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-[var(--ink-soft)]/45">
                <p>{c.status}</p>
                <p>{relativeTime(c.lastMessageAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
