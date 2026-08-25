import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  getInstanceConnectionState,
  parseEvolutionConnectionState,
  setInstanceWebhook,
} from "@/lib/evolution";
import { tenantWebhookUrl } from "./shared";

const schema = z.object({
  apiUrl: z.string().url(),
  apiKey: z.string().optional().default(""),
  instanceName: z.string().min(1),
  webhookSecret: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const config = await prisma.evolutionConfig.findUnique({
    where: { tenantId: user.tenantId },
  });

  if (!config) return NextResponse.json(null);

  return NextResponse.json({
    ...config,
    apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "",
    webhookUrl: tenantWebhookUrl(user.tenant.slug),
  });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.evolutionConfig.findUnique({
      where: { tenantId: user.tenantId },
    });

    const apiKey =
      !body.apiKey || body.apiKey.startsWith("••••")
        ? existing?.apiKey
        : body.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key obrigatória" },
        { status: 400 }
      );
    }

    const credentials = {
      apiUrl: body.apiUrl,
      apiKey,
      instanceName: body.instanceName,
    };

    const webhookUrl = tenantWebhookUrl(user.tenant.slug);

    let isConnected = false;
    try {
      const state = await getInstanceConnectionState(credentials);
      isConnected = parseEvolutionConnectionState(state) === "open";
    } catch {
      isConnected = false;
    }

    try {
      await setInstanceWebhook(credentials, webhookUrl, body.webhookSecret);
    } catch {
      /* instance may not exist yet — connect will create and set webhook */
    }

    const config = await prisma.evolutionConfig.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        apiUrl: body.apiUrl,
        apiKey,
        instanceName: body.instanceName,
        webhookSecret: body.webhookSecret,
        isConnected,
        lastSyncAt: new Date(),
      },
      update: {
        apiUrl: body.apiUrl,
        apiKey,
        instanceName: body.instanceName,
        webhookSecret: body.webhookSecret,
        isConnected,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      isConnected: config.isConnected,
      webhookUrl,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar integração" }, { status: 500 });
  }
}
