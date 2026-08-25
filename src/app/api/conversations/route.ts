import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status");

  const conversations = await prisma.conversation.findMany({
    where: {
      tenantId: user.tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      agent: { select: { name: true, avatarEmoji: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return NextResponse.json(conversations);
}
