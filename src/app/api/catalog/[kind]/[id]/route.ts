import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const productPatch = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  price: z.number().nonnegative().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const servicePatch = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  price: z.number().nonnegative().optional(),
  priceType: z.enum(["fixed", "from", "hourly", "quote"]).optional(),
  durationMin: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { kind, id } = await ctx.params;

  try {
    const body = await req.json();

    if (kind === "product") {
      const existing = await prisma.product.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
      const data = productPatch.parse(body);
      const updated = await prisma.product.update({ where: { id }, data });
      return NextResponse.json(updated);
    }

    if (kind === "service") {
      const existing = await prisma.service.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
      const data = servicePatch.parse(body);
      const updated = await prisma.service.update({ where: { id }, data });
      return NextResponse.json(updated);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { kind, id } = await ctx.params;

  if (kind === "product") {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (kind === "service") {
    const existing = await prisma.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
