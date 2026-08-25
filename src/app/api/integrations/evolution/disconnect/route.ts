import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logoutEvolutionInstance } from "@/lib/evolution";

/** Desconecta o WhatsApp (logout da instância) */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const config = await prisma.evolutionConfig.findUnique({
    where: { tenantId: user.tenantId },
  });

  if (!config) {
    return NextResponse.json({ error: "Integração não configurada" }, { status: 400 });
  }

  try {
    await logoutEvolutionInstance({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName,
    });
  } catch (err) {
    console.warn("Logout Evolution:", err);
  }

  await prisma.evolutionConfig.update({
    where: { tenantId: user.tenantId },
    data: { isConnected: false, lastSyncAt: new Date() },
  });

  return NextResponse.json({ ok: true, isConnected: false, state: "close" });
}
