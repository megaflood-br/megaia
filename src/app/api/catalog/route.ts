import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().nonnegative(),
  compareAt: z.number().optional(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().nonnegative(),
  priceType: z.enum(["fixed", "from", "hourly", "quote"]).optional(),
  currency: z.string().optional(),
  durationMin: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") || "all";

  if (type === "products") {
    return NextResponse.json(
      await prisma.product.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: "asc" },
      })
    );
  }
  if (type === "services") {
    return NextResponse.json(
      await prisma.service.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: "asc" },
      })
    );
  }

  const [products, services] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ products, services });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const raw = await req.json();
    if (raw.kind === "service") {
      const body = serviceSchema.parse(raw);
      const service = await prisma.service.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          description: body.description,
          category: body.category,
          price: body.price,
          priceType: body.priceType || "fixed",
          currency: body.currency || "BRL",
          durationMin: body.durationMin,
          isActive: body.isActive ?? true,
        },
      });
      return NextResponse.json(service, { status: 201 });
    }

    const body = productSchema.parse(raw);
    const product = await prisma.product.create({
      data: {
        tenantId: user.tenantId,
        name: body.name,
        sku: body.sku,
        description: body.description,
        category: body.category,
        price: body.price,
        compareAt: body.compareAt,
        currency: body.currency || "BRL",
        unit: body.unit,
        inStock: body.inStock ?? true,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar" }, { status: 500 });
  }
}
