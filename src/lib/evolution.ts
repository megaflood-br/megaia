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

/** Evolution v2 sendText may wrap the key at the root, under message, or in an array. */
export function extractSentMessageId(data: unknown): string | undefined {
  const visit = (value: unknown, depth = 0): string | undefined => {
    if (!value || depth > 4) return undefined;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, depth + 1);
        if (found) return found;
      }
      return undefined;
    }
    if (typeof value !== "object") return undefined;
    const obj = value as Record<string, unknown>;
    const key = obj.key;
    if (key && typeof key === "object") {
      const id = (key as Record<string, unknown>).id;
      if (typeof id === "string" && id) return id;
    }
    return visit(obj.message, depth + 1) || visit(obj.data, depth + 1);
  };
  return visit(data);
}

export function normalizeWhatsAppText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

type AssistantEchoCandidate = {
  content: string;
  externalMsgId: string | null;
  createdAt: Date;
};

/** Echo of a bot sendText (fromMe + same id or same recent text). Human replies are fromMe too. */
export function isBotOutboundEcho(params: {
  fromMe: boolean;
  text: string;
  messageId?: string;
  recentAssistant?: AssistantEchoCandidate[];
  maxAgeMs?: number;
}): boolean {
  if (!params.fromMe) return false;
  const text = normalizeWhatsAppText(params.text);
  if (!text) return true;

  const maxAgeMs = params.maxAgeMs ?? 5 * 60 * 1000;
  const now = Date.now();

  for (const msg of params.recentAssistant ?? []) {
    if (
      params.messageId &&
      msg.externalMsgId &&
      params.messageId === msg.externalMsgId
    ) {
      return true;
    }
    if (normalizeWhatsAppText(msg.content) !== text) continue;
    const age = now - new Date(msg.createdAt).getTime();
    if (age >= 0 && age < maxAgeMs) return true;
  }
  return false;
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

  if (!from) return null;
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
