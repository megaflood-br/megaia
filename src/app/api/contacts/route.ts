import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  backfillConversationContacts,
} from "@/lib/crm-store";
import {
  contactToDto,
  isContactStage,
  normalizePhone,
  serializeCustomFields,
} from "@/lib/crm";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
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
  source: z.string().optional(),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await backfillConversationContacts(user.tenantId);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const stage = url.searchParams.get("stage")?.trim() || "";

  const contacts = await prisma.contact.findMany({
    where: {
      tenantId: user.tenantId,
      ...(isContactStage(stage) ? { stage } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q.replace(/\D/g, "") || q } },
              { email: { contains: q } },
              { company: { contains: q } },
              { document: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      conversations: {
        select: { id: true, lastMessageAt: true, status: true },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      },
      _count: { select: { conversations: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const grouped = await prisma.contact.groupBy({
    by: ["stage"],
    where: { tenantId: user.tenantId },
    _count: true,
  });
  const counts: Record<string, number> = {
    lead: 0,
    atendimento: 0,
    proposta: 0,
    cliente: 0,
    perdido: 0,
  };
  for (const row of grouped) {
    counts[row.stage] = row._count;
  }
  const total = grouped.reduce((sum, row) => sum + row._count, 0);

  return NextResponse.json({
    contacts: contacts.map((c) => ({
      ...contactToDto(c),
      conversationCount: c._count.conversations,
      lastConversation: c.conversations[0] ?? null,
    })),
    counts: { ...counts, total },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    const phone = normalizePhone(body.phone);
    if (phone) {
      const clash = await prisma.contact.findFirst({
        where: { tenantId: user.tenantId, phone },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Já existe um contato com este telefone", contactId: clash.id },
          { status: 409 }
        );
      }
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: user.tenantId,
        name: body.name,
        phone,
        email: body.email?.trim() || null,
        document: body.document?.trim() || null,
        company: body.company?.trim() || null,
        stage: body.stage && isContactStage(body.stage) ? body.stage : "lead",
        tags: body.tags ?? "",
        notes: body.notes ?? "",
        fields: serializeCustomFields(body.fields),
        source: body.source || "manual",
      },
    });
    return NextResponse.json(contactToDto(contact), { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar contato" }, { status: 500 });
  }
}
