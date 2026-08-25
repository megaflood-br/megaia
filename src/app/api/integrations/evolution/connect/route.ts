import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EvolutionApiError,
  connectEvolutionInstance,
  ensureEvolutionInstance,
  extractQrPayload,
  parseEvolutionConnectionState,
} from "@/lib/evolution";
import { getTenantEvolution, isConnectedState } from "../shared";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const ctx = await getTenantEvolution(user);
  if (!ctx) {
    return NextResponse.json(
      { error: "Salve a URL, a API key e o nome da instância antes de conectar." },
      { status: 400 }
    );
  }

  try {
    await ensureEvolutionInstance(ctx.credentials, ctx.webhookUrl);
    const payload = await connectEvolutionInstance(ctx.credentials);
    const state = parseEvolutionConnectionState(payload);
    const qr = extractQrPayload(payload);

    await prisma.evolutionConfig.update({
      where: { tenantId: user.tenantId },
      data: {
        isConnected: isConnectedState(state),
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      state: isConnectedState(state) ? "open" : state === "unknown" && qr.base64 ? "connecting" : state,
      qrBase64: qr.base64,
      pairingCode: qr.pairingCode,
      webhookUrl: ctx.webhookUrl,
    });
  } catch (err) {
    const message =
      err instanceof EvolutionApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Falha ao conectar";
    console.error(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
