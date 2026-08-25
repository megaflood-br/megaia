export type EvolutionConfigLike = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
};

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

export async function createEvolutionInstance(config: EvolutionConfigLike) {
  return evolutionRequest(config, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: config.instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
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
  if (from.endsWith("@g.us")) return null; // ignore groups for MVP

  return {
    instance: (payload.instance as string) || undefined,
    from,
    pushName: (data.pushName as string) || undefined,
    text: text?.trim(),
    messageId: (key.id as string) || undefined,
    fromMe,
  };
}
