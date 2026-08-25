import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateAgentReply } from "@/lib/openai";

const schema = z.object({
  agentId: z.string(),
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

/** Chat de teste no painel (sem WhatsApp) */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const agent = await prisma.agent.findFirst({
      where: { id: body.agentId, tenantId: user.tenantId },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
    }

    let conversationId = body.conversationId;
    if (!conversationId) {
      const conv = await prisma.conversation.create({
        data: {
          tenantId: user.tenantId,
          agentId: agent.id,
          channel: "web",
          contactName: "Teste no painel",
          status: "open",
        },
      });
      conversationId = conv.id;
    }

    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: body.message,
      },
    });

    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    const reply = await generateAgentReply({
      tenantId: user.tenantId,
      agentId: agent.id,
      userMessage: body.message,
      history: history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(0, -1)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    });

    const assistantMsg = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: reply.content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        status: reply.handoff ? "handoff" : "open",
      },
    });

    return NextResponse.json({
      conversationId,
      message: assistantMsg,
      handoff: reply.handoff,
      demo: reply.demo ?? false,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar resposta" }, { status: 500 });
  }
}
