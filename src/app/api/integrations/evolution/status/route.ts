import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  connectEvolutionInstance,
  extractQrPayload,
  getInstanceConnectionState,
  parseConnectionState,
} from "@/lib/evolution";

/** Status da conexão + QR atualizado (para polling no painel) */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const config = await prisma.evolutionConfig.findUnique({
    where: { tenantId: user.tenantId },
  });

  if (!config) {
    return NextResponse.json({ state: "unknown", isConnected: false });
  }

  const credentials = {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    instanceName: config.instanceName,
  };

  const refreshQr = new URL(req.url).searchParams.get("qr") === "1";

  try {
    let state = parseConnectionState(await getInstanceConnectionState(credentials));
    let qr: string | null = null;
    let pairingCode: string | null = null;

    if (state !== "open" && refreshQr) {
      const connectPayload = await connectEvolutionInstance(credentials);
      const extracted = extractQrPayload(connectPayload);
      qr = extracted.base64;
      pairingCode = extracted.pairingCode;
      state = parseConnectionState(
        await getInstanceConnectionState(credentials).catch(() => null)
      );
      if (state === "unknown" && qr) state = "connecting";
    }

    const isConnected = state === "open";
    if (config.isConnected !== isConnected) {
      await prisma.evolutionConfig.update({
        where: { tenantId: user.tenantId },
        data: { isConnected, lastSyncAt: new Date() },
      });
    }

    return NextResponse.json({
      state,
      isConnected,
      qr,
      pairingCode,
      instanceName: config.instanceName,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      state: "unknown",
      isConnected: false,
      error: err instanceof Error ? err.message : "Erro ao consultar status",
    });
  }
}
