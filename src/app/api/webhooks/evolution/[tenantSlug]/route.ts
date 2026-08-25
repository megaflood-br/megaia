import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIncomingWebhook, sendWhatsAppText } from "@/lib/evolution";
import { generateAgentReply } from "@/lib/openai";

type Ctx = { params: Promise<{ tenantSlug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { tenantSlug } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      evolutionConfig: true,
      agents: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (!tenant?.evolutionConfig) {
    return NextResponse.json({ error: "Tenant/integração não encontrados" }, { status: 404 });
  }

  const secret = req.headers.get("x-webhook-secret") || req.headers.get("apikey");
  if (
    tenant.evolutionConfig.webhookSecret &&
    secret &&
    secret !== tenant.evolutionConfig.webhookSecret
  ) {
    return NextResponse.json({ error: "Secret inválido" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, skipped: "invalid json" });
  }

  // Atualiza status de conexão quando a Evolution notifica
  const eventName = String(
    (body as { event?: string; type?: string })?.event ||
      (body as { type?: string })?.type ||
      ""
  ).toLowerCase();

  if (
    eventName.includes("connection") ||
    eventName.includes("connection.update")
  ) {
    const data = (body as { data?: { state?: string; status?: string } })?.data;
    const state = String(data?.state || data?.status || "").toLowerCase();
    const isConnected = state === "open" || state === "connected";
    await prisma.evolutionConfig.update({
      where: { tenantId: tenant.id },
      data: { isConnected, lastSyncAt: new Date() },
    });
    return NextResponse.json({ ok: true, connectionUpdated: isConnected });
  }

  const incoming = parseIncomingWebhook(body);
  if (!incoming?.text || !incoming.from) {
    return NextResponse.json({ ok: true, skipped: "no text" });
  }

  const agent = tenant.agents[0];
  if (!agent) {
    return NextResponse.json({ ok: true, skipped: "no agent" });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      tenantId: tenant.id,
      externalId: incoming.from,
      status: { in: ["open", "handoff"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        agentId: agent.id,
        channel: "whatsapp",
        externalId: incoming.from,
        contactName: incoming.pushName,
        contactPhone: incoming.from.replace("@s.whatsapp.net", ""),
        status: "open",
      },
    });
  }

  if (conversation.status === "handoff") {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: incoming.text,
        externalMsgId: incoming.messageId,
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
    return NextResponse.json({ ok: true, handoff: true });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: incoming.text,
      externalMsgId: incoming.messageId,
    },
  });

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const reply = await generateAgentReply({
    tenantId: tenant.id,
    agentId: agent.id,
    userMessage: incoming.text,
    history: history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(0, -1)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: reply.content,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      status: reply.handoff ? "handoff" : "open",
    },
  });

  try {
    await sendWhatsAppText(
      tenant.evolutionConfig,
      incoming.from,
      reply.content
    );
  } catch (err) {
    console.error("Falha ao enviar WhatsApp:", err);
  }

  return NextResponse.json({ ok: true, handoff: reply.handoff });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { tenantSlug } = await ctx.params;
  return NextResponse.json({
    status: "ok",
    webhook: `evolution/${tenantSlug}`,
    hint: "Configure este endpoint na Evolution API para eventos MESSAGES_UPSERT",
  });
}
