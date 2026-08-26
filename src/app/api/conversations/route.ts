import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status");
  const allowed = ["open", "handoff", "closed"];
  const statusFilter = status && allowed.includes(status) ? status : undefined;

  const [conversations, grouped] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        agent: { select: { name: true, avatarEmoji: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    }),
    prisma.conversation.groupBy({
      by: ["status"],
      where: { tenantId: user.tenantId },
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = { open: 0, handoff: 0, closed: 0 };
  for (const row of grouped) {
    counts[row.status] = row._count;
  }
  const total = grouped.reduce((sum, row) => sum + row._count, 0);

  return NextResponse.json({
    conversations,
    counts: { ...counts, total },
  });
}
