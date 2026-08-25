import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2).optional(),
  category: z.string().optional(),
  content: z.string().min(5).optional(),
  tags: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.knowledgeItem.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = schema.parse(await req.json());
    const item = await prisma.knowledgeItem.update({ where: { id }, data: body });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.knowledgeItem.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.knowledgeItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
