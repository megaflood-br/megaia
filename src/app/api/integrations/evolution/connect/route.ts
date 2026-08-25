import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { startWhatsAppQrSession } from "@/lib/evolution";

async function getTenantConfig(tenantId: string) {
  return prisma.evolutionConfig.findUnique({ where: { tenantId } });
}

/** Inicia conexão e devolve QR Code para escanear no painel */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const config = await getTenantConfig(user.tenantId);
  if (!config) {
    return NextResponse.json(
      { error: "Salve a URL, API Key e nome da instância antes de conectar" },
      { status: 400 }
    );
  }

  const webhookUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/webhooks/evolution/${user.tenant.slug}`;

  try {
    const session = await startWhatsAppQrSession({
      config: {
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        instanceName: config.instanceName,
      },
      webhookUrl,
      webhookSecret: config.webhookSecret,
    });

    await prisma.evolutionConfig.update({
      where: { tenantId: user.tenantId },
      data: {
        isConnected: session.state === "open",
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      state: session.state,
      qr: session.qr,
      pairingCode: session.pairingCode,
      message: session.message,
      created: session.created,
      webhookUrl,
    });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Falha ao conectar na Evolution API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
