import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EvolutionApiError, logoutEvolutionInstance } from "@/lib/evolution";
import { getTenantEvolution } from "../shared";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const ctx = await getTenantEvolution(user);
  if (!ctx) {
    return NextResponse.json({ error: "Integração não configurada" }, { status: 400 });
  }

  try {
    await logoutEvolutionInstance(ctx.credentials);
  } catch (err) {
    if (!(err instanceof EvolutionApiError && err.status === 400)) {
      const message = err instanceof Error ? err.message : "Falha ao desconectar";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  await prisma.evolutionConfig.update({
    where: { tenantId: user.tenantId },
    data: { isConnected: false, lastSyncAt: new Date() },
  });

  return NextResponse.json({ ok: true, state: "close", isConnected: false });
}
