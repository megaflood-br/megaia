import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { extractSentMessageId, sendWhatsAppText } from "@/lib/evolution";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "human",
      content: parsed.data.content,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      status: "handoff",
    },
  });

  let sent = false;
  let sendError: string | null = null;

  if (conversation.channel === "whatsapp" && conversation.externalId) {
    const evolution = await prisma.evolutionConfig.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!evolution) {
      sendError = "WhatsApp não configurado em Integrações.";
    } else {
      try {
        const result = await sendWhatsAppText(
          evolution,
          conversation.externalId,
          parsed.data.content
        );
        const sentId = extractSentMessageId(result);
        if (sentId) {
          await prisma.message.update({
            where: { id: message.id },
            data: { externalMsgId: sentId },
          });
        }
        sent = true;
      } catch (err) {
        sendError = err instanceof Error ? err.message : "Falha ao enviar no WhatsApp";
        console.error("Inbox send WhatsApp:", err);
      }
    }
  } else {
    sent = true;
  }

  const fresh = await prisma.message.findUnique({ where: { id: message.id } });
  return NextResponse.json({
    ok: true,
    message: fresh ?? message,
    sent,
    status: "handoff",
    error: sendError,
  });
}
