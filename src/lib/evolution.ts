export type EvolutionConfigLike = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
};

export type ConnectionState = "open" | "connecting" | "close" | "unknown";

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export async function evolutionRequest(
  config: EvolutionConfigLike,
  path: string,
  init?: RequestInit
) {
  const url = `${normalizeUrl(config.apiUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      `Evolution API ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`
    );
  }

  return data;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/** Normaliza base64 do QR para data URL utilizável em <img> */
export function normalizeQrBase64(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image")) return trimmed;
  return `data:image/png;base64,${trimmed.replace(/^base64,/, "")}`;
}

/** Extrai QR (base64) e pairing code de respostas variadas da Evolution */
export function extractQrPayload(data: unknown): {
  base64: string | null;
  pairingCode: string | null;
  code: string | null;
  count: number | null;
} {
  const root = asRecord(data) || {};
  const qrcode = asRecord(root.qrcode) || {};
  const nested = asRecord(root.data) || {};

  const base64 =
    normalizeQrBase64(
      (root.base64 as string) ||
        (qrcode.base64 as string) ||
        (nested.base64 as string) ||
        (asRecord(nested.qrcode)?.base64 as string)
    ) || null;

  const pairingCode =
    (root.pairingCode as string) ||
    (qrcode.pairingCode as string) ||
    (nested.pairingCode as string) ||
    null;

  const code =
    (root.code as string) ||
    (qrcode.code as string) ||
    (nested.code as string) ||
    null;

  const countRaw = root.count ?? qrcode.count ?? nested.count;
  const count = typeof countRaw === "number" ? countRaw : null;

  return { base64, pairingCode, code, count };
}

export function parseConnectionState(data: unknown): ConnectionState {
  const root = asRecord(data) || {};
  const instance = asRecord(root.instance) || {};
  const state = String(
    instance.state || root.state || instance.status || root.status || ""
  ).toLowerCase();

  if (state === "open" || state === "connected") return "open";
  if (state === "connecting" || state === "qrcode") return "connecting";
  if (state === "close" || state === "closed" || state === "disconnected") {
    return "close";
  }
  return "unknown";
}

export async function sendWhatsAppText(
  config: EvolutionConfigLike,
  number: string,
  text: string
) {
  const remoteJid = number.includes("@")
    ? number
    : `${number.replace(/\D/g, "")}@s.whatsapp.net`;

  return evolutionRequest(
    config,
    `/message/sendText/${encodeURIComponent(config.instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: remoteJid,
        text,
      }),
    }
  );
}

export async function getInstanceConnectionState(config: EvolutionConfigLike) {
  return evolutionRequest(
    config,
    `/instance/connectionState/${encodeURIComponent(config.instanceName)}`,
    { method: "GET" }
  );
}

export async function connectEvolutionInstance(config: EvolutionConfigLike) {
  return evolutionRequest(
    config,
    `/instance/connect/${encodeURIComponent(config.instanceName)}`,
    { method: "GET" }
  );
}

export async function createEvolutionInstance(
  config: EvolutionConfigLike,
  options?: { webhookUrl?: string; webhookSecret?: string | null }
) {
  const body: Record<string, unknown> = {
    instanceName: config.instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
  };

  if (options?.webhookUrl) {
    body.webhook = {
      url: options.webhookUrl,
      byEvents: false,
      base64: false,
      events: [
        "MESSAGES_UPSERT",
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED",
      ],
    };
    if (options.webhookSecret) {
      body.webhook = {
        ...(body.webhook as object),
        headers: { "x-webhook-secret": options.webhookSecret },
      };
    }
  }

  return evolutionRequest(config, "/instance/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function setEvolutionWebhook(
  config: EvolutionConfigLike,
  webhookUrl: string,
  webhookSecret?: string | null
) {
  const payload: Record<string, unknown> = {
    webhook: {
      enabled: true,
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
      ...(webhookSecret
        ? { headers: { "x-webhook-secret": webhookSecret } }
        : {}),
    },
  };

  // Evolution v2 costuma usar /webhook/set/{instance}
  try {
    return await evolutionRequest(
      config,
      `/webhook/set/${encodeURIComponent(config.instanceName)}`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  } catch {
    // fallback formato alternativo
    return evolutionRequest(
      config,
      `/webhook/set/${encodeURIComponent(config.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        }),
      }
    );
  }
}

export async function logoutEvolutionInstance(config: EvolutionConfigLike) {
  return evolutionRequest(
    config,
    `/instance/logout/${encodeURIComponent(config.instanceName)}`,
    { method: "DELETE" }
  );
}

export async function fetchEvolutionInstances(config: EvolutionConfigLike) {
  return evolutionRequest(config, "/instance/fetchInstances", { method: "GET" });
}

export function instanceExistsInList(
  data: unknown,
  instanceName: string
): boolean {
  if (!data) return false;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data)?.instance)
      ? (asRecord(data)?.instance as unknown[])
      : null;

  if (!list) {
    // resposta pode ser objeto único
    const single = asRecord(data);
    const name =
      single?.instanceName ||
      asRecord(single?.instance)?.instanceName ||
      asRecord(single?.instance)?.name;
    return String(name || "").toLowerCase() === instanceName.toLowerCase();
  }

  return list.some((item) => {
    const row = asRecord(item) || {};
    const name =
      row.instanceName ||
      row.name ||
      asRecord(row.instance)?.instanceName ||
      asRecord(row.instance)?.name;
    return String(name || "").toLowerCase() === instanceName.toLowerCase();
  });
}

/**
 * Garante instância, configura webhook, inicia connect e devolve QR se houver.
 */
export async function startWhatsAppQrSession(params: {
  config: EvolutionConfigLike;
  webhookUrl: string;
  webhookSecret?: string | null;
}) {
  const { config, webhookUrl, webhookSecret } = params;

  let created = false;
  let createPayload: unknown = null;

  try {
    const instances = await fetchEvolutionInstances(config);
    const exists = instanceExistsInList(instances, config.instanceName);
    if (!exists) {
      createPayload = await createEvolutionInstance(config, {
        webhookUrl,
        webhookSecret,
      });
      created = true;
    }
  } catch {
    // Se fetchInstances falhar, tenta criar; se já existir, Evolution retorna erro e seguimos no connect
    try {
      createPayload = await createEvolutionInstance(config, {
        webhookUrl,
        webhookSecret,
      });
      created = true;
    } catch {
      created = false;
    }
  }

  // Se create já trouxe QR, usa
  let qr = extractQrPayload(createPayload);

  // Configura webhook (idempotente)
  try {
    await setEvolutionWebhook(config, webhookUrl, webhookSecret);
  } catch (err) {
    console.warn("Falha ao setar webhook Evolution:", err);
  }

  let state: ConnectionState = "unknown";
  try {
    state = parseConnectionState(await getInstanceConnectionState(config));
  } catch {
    state = "unknown";
  }

  if (state === "open") {
    return {
      created,
      state,
      qr: null as string | null,
      pairingCode: null as string | null,
      message: "WhatsApp já está conectado",
    };
  }

  // Solicita QR / reconexão
  const connectPayload = await connectEvolutionInstance(config);
  const connectQr = extractQrPayload(connectPayload);
  if (connectQr.base64 || connectQr.pairingCode) {
    qr = connectQr;
  }

  try {
    state = parseConnectionState(await getInstanceConnectionState(config));
  } catch {
    state = qr.base64 ? "connecting" : state;
  }

  return {
    created,
    state: state === "open" ? "open" : "connecting",
    qr: qr.base64,
    pairingCode: qr.pairingCode,
    message: qr.base64
      ? "Escaneie o QR Code no WhatsApp"
      : qr.pairingCode
        ? "Use o código de pareamento no WhatsApp"
        : "Aguardando QR Code da Evolution API",
  };
}

/** Extrai texto e remetente de payloads comuns da Evolution API v2 */
export function parseIncomingWebhook(body: unknown): {
  instance?: string;
  from?: string;
  pushName?: string;
  text?: string;
  messageId?: string;
  fromMe?: boolean;
} | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as Record<string, unknown>;
  const data = (payload.data || payload) as Record<string, unknown>;
  const key = (data.key || {}) as Record<string, unknown>;
  const message = (data.message || {}) as Record<string, unknown>;

  const text =
    (message.conversation as string) ||
    ((message.extendedTextMessage as Record<string, unknown>)?.text as string) ||
    ((message.imageMessage as Record<string, unknown>)?.caption as string) ||
    undefined;

  const from = (key.remoteJid as string) || undefined;
  const fromMe = Boolean(key.fromMe);

  if (!from || fromMe) return null;
  if (from.endsWith("@g.us")) return null;

  return {
    instance: (payload.instance as string) || undefined,
    from,
    pushName: (data.pushName as string) || undefined,
    text: text?.trim(),
    messageId: (key.id as string) || undefined,
    fromMe,
  };
}
