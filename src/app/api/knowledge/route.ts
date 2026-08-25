import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2),
  category: z.string().default("geral"),
  content: z.string().min(5),
  tags: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const items = await prisma.knowledgeItem.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const item = await prisma.knowledgeItem.create({
      data: {
        tenantId: user.tenantId,
        title: body.title,
        category: body.category,
        content: body.content,
        tags: body.tags,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar" }, { status: 500 });
  }
}
