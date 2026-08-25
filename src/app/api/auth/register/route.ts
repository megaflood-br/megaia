import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  hashPassword,
  slugify,
} from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json());
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "E-mail já cadastrado" },
        { status: 409 }
      );
    }

    let slug = slugify(body.companyName) || "empresa";
    const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const passwordHash = await hashPassword(body.password);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.companyName,
        slug,
        companyProfile: {
          create: { tradeName: body.companyName },
        },
        users: {
          create: {
            name: body.name,
            email: body.email.toLowerCase(),
            passwordHash,
            role: "owner",
          },
        },
        agents: {
          create: {
            name: "Assistente",
            slug: "assistente",
            avatarEmoji: "✨",
            roleTitle: "Atendimento",
            personality: "Prestativo, claro e cordial.",
            welcomeMessage: `Olá! Sou o assistente da ${body.companyName}. Como posso ajudar?`,
            systemPrompt: `Você representa ${body.companyName} no atendimento ao cliente.`,
          },
        },
      },
      include: { users: true },
    });

    await createSession(tenant.users[0].id);

    return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar" }, { status: 500 });
  }
}
