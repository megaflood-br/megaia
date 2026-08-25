import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().optional().nullable(),
  avatarEmoji: z.string().optional().nullable(),
  roleTitle: z.string().optional().nullable(),
  personality: z.string().optional().nullable(),
  systemPrompt: z.string().optional().nullable(),
  welcomeMessage: z.string().optional().nullable(),
  fallbackMessage: z.string().optional().nullable(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(100).max(4000).optional(),
  isActive: z.boolean().optional(),
  handoffEnabled: z.boolean().optional(),
  useKnowledge: z.boolean().optional(),
  useCatalog: z.boolean().optional(),
  handoffKeywords: z.array(z.string()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const agent = await prisma.agent.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!agent) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.agent.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = schema.parse(await req.json());
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...body,
        avatarUrl: body.avatarUrl === "" ? null : body.avatarUrl,
        handoffKeywords: body.handoffKeywords
          ? JSON.stringify(body.handoffKeywords)
          : undefined,
      },
    });
    return NextResponse.json(agent);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.agent.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.agent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
