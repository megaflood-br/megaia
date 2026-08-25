import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EvolutionApiError,
  extractQrPayload,
  getInstanceConnectionState,
  parseEvolutionConnectionState,
} from "@/lib/evolution";
import { getTenantEvolution, isConnectedState } from "../shared";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const ctx = await getTenantEvolution(user);
  if (!ctx) return NextResponse.json({ state: "unconfigured" });

  try {
    const statePayload = await getInstanceConnectionState(ctx.credentials);
    const state = parseEvolutionConnectionState(statePayload);
    const qr = extractQrPayload(statePayload);

    await prisma.evolutionConfig.update({
      where: { tenantId: user.tenantId },
      data: { isConnected: isConnectedState(state), lastSyncAt: new Date() },
    });

    return NextResponse.json({
      state: isConnectedState(state) ? "open" : state,
      qrBase64: qr.base64,
      pairingCode: qr.pairingCode,
      isConnected: isConnectedState(state),
    });
  } catch (err) {
    const message =
      err instanceof EvolutionApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Falha ao consultar status";
    return NextResponse.json(
      { state: "error", error: message, isConnected: false },
      { status: 502 }
    );
  }
}
