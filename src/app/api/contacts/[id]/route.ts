import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  contactToDto,
  isContactStage,
  normalizePhone,
  serializeCustomFields,
} from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  stage: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  fields: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});

async function loadOwnContact(tenantId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, tenantId },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

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
  if (!contact) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    ...contactToDto(contact),
    conversations: contact.conversations,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await loadOwnContact(user.tenantId, id);
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.document !== undefined) data.document = body.document?.trim() || null;
    if (body.company !== undefined) data.company = body.company?.trim() || null;
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.fields !== undefined) data.fields = serializeCustomFields(body.fields);
    if (body.stage !== undefined) {
      if (!isContactStage(body.stage)) {
        return NextResponse.json({ error: "Estágio inválido" }, { status: 400 });
      }
      data.stage = body.stage;
    }
    if (body.phone !== undefined) {
      const phone = normalizePhone(body.phone);
      if (phone && phone !== existing.phone) {
        const clash = await prisma.contact.findFirst({
          where: { tenantId: user.tenantId, phone, NOT: { id } },
        });
        if (clash) {
          return NextResponse.json(
            { error: "Já existe um contato com este telefone", contactId: clash.id },
            { status: 409 }
          );
        }
      }
      data.phone = phone;
    }

    const contact = await prisma.contact.update({
      where: { id },
      data,
    });

    await prisma.conversation.updateMany({
      where: { contactId: id, tenantId: user.tenantId },
      data: {
        contactName: contact.name,
        contactPhone: contact.phone,
      },
    });

    return NextResponse.json(contactToDto(contact));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar contato" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await loadOwnContact(user.tenantId, id);
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
