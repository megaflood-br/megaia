import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ConversationLive } from "./live";

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
    <ConversationLive
      initial={{
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        contactName: conversation.contactName,
        contactPhone: conversation.contactPhone,
        agent: {
          name: conversation.agent.name,
          avatarEmoji: conversation.agent.avatarEmoji,
        },
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      }}
    />
  );
}
