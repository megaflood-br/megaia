import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { kind, id } = await ctx.params;
  const body = await req.json();

  if (kind === "product") {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const updated = await prisma.product.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  }

  if (kind === "service") {
    const existing = await prisma.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const updated = await prisma.service.update({ where: { id }, data: body });
    return NextResponse.json(updated);
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
