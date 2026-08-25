import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  tradeName: z.string().optional().nullable(),
  legalName: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  mission: z.string().optional().nullable(),
  differentials: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable(),
  timezone: z.string().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: user.tenantId },
  });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const profile = await prisma.companyProfile.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, ...body },
      update: body,
    });
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
