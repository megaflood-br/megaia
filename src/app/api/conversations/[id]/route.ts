import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { contactToDto } from "@/lib/crm";
import { attachConversationContact } from "@/lib/crm-store";

type Ctx = { params: Promise<{ id: string }> };

async function loadConversation(tenantId: string, id: string) {
  let conversation = await prisma.conversation.findFirst({
    where: { id, tenantId },
    include: {
      agent: true,
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return null;
  if (!conversation.contact) {
    await attachConversationContact(conversation);
    conversation = await prisma.conversation.findFirst({
      where: { id, tenantId },
      include: {
        agent: true,
        contact: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }
  if (!conversation) return null;
  return {
    ...conversation,
    contact: conversation.contact ? contactToDto(conversation.contact) : null,
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const conversation = await loadConversation(user.tenantId, id);
  if (!conversation) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await prisma.conversation.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  let contactId: string | undefined;
  if (typeof body.contactId === "string" && body.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, tenantId: user.tenantId },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
    }
    contactId = contact.id;
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(typeof body.status === "string" ? { status: body.status } : {}),
      ...(contactId
        ? {
            contactId,
          }
        : {}),
    },
  });

  return NextResponse.json(updated);
}
