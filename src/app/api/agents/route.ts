import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, slugify } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  avatarEmoji: z.string().optional(),
  roleTitle: z.string().optional(),
  personality: z.string().optional(),
  systemPrompt: z.string().optional(),
  welcomeMessage: z.string().optional(),
  fallbackMessage: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(100).max(4000).optional(),
  isActive: z.boolean().optional(),
  handoffEnabled: z.boolean().optional(),
  useKnowledge: z.boolean().optional(),
  useCatalog: z.boolean().optional(),
  handoffKeywords: z.array(z.string()).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const agents = await prisma.agent.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    let slug = slugify(body.name) || "agente";
    const exists = await prisma.agent.findUnique({
      where: { tenantId_slug: { tenantId: user.tenantId, slug } },
    });
    if (exists) slug = `${slug}-${Date.now().toString(36).slice(-3)}`;

    const agent = await prisma.agent.create({
      data: {
        tenantId: user.tenantId,
        name: body.name,
        slug,
        avatarUrl: body.avatarUrl || null,
        avatarEmoji: body.avatarEmoji || "🤖",
        roleTitle: body.roleTitle,
        personality: body.personality,
        systemPrompt: body.systemPrompt,
        welcomeMessage: body.welcomeMessage,
        fallbackMessage: body.fallbackMessage,
        model: body.model || "gpt-4o-mini",
        temperature: body.temperature ?? 0.4,
        maxTokens: body.maxTokens ?? 800,
        isActive: body.isActive ?? true,
        handoffEnabled: body.handoffEnabled ?? true,
        useKnowledge: body.useKnowledge ?? true,
        useCatalog: body.useCatalog ?? true,
        handoffKeywords: body.handoffKeywords
          ? JSON.stringify(body.handoffKeywords)
          : null,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar agente" }, { status: 500 });
  }
}
