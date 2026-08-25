import OpenAI from "openai";
import { prisma } from "@/lib/db";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY não configurada");
  }
  return new OpenAI({ apiKey: key });
}

type AgentContext = {
  agent: {
    name: string;
    roleTitle: string | null;
    personality: string | null;
    systemPrompt: string | null;
    model: string;
    temperature: number;
    maxTokens: number;
    useKnowledge: boolean;
    useCatalog: boolean;
    handoffEnabled: boolean;
    handoffKeywords: string | null;
    fallbackMessage: string | null;
  };
  company: {
    tradeName: string | null;
    description: string | null;
    mission: string | null;
    differentials: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    businessHours: string | null;
  } | null;
  knowledge: { title: string; category: string; content: string }[];
  products: {
    name: string;
    description: string | null;
    category: string | null;
    price: number;
    currency: string;
    inStock: boolean;
  }[];
  services: {
    name: string;
    description: string | null;
    category: string | null;
    price: number;
    priceType: string;
    currency: string;
    durationMin: number | null;
  }[];
};

function formatMoney(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function buildSystemPrompt(ctx: AgentContext) {
  const parts: string[] = [];

  parts.push(
    `Você é ${ctx.agent.name}${ctx.agent.roleTitle ? `, ${ctx.agent.roleTitle}` : ""}.`
  );

  if (ctx.agent.personality) {
    parts.push(`Personalidade e tom: ${ctx.agent.personality}`);
  }

  if (ctx.agent.systemPrompt) {
    parts.push(ctx.agent.systemPrompt);
  }

  parts.push(
    [
      "Regras gerais:",
      "- Responda em português do Brasil, de forma clara e concisa.",
      "- Use apenas informações fornecidas no contexto; não invente preços ou políticas.",
      "- Se não souber, diga que vai verificar ou ofereça transferir para um humano.",
      "- Quando falar de preços, use o formato brasileiro (R$).",
      "- Não mencione que você é um modelo de IA a menos que perguntado.",
    ].join("\n")
  );

  if (ctx.company) {
    const c = ctx.company;
    parts.push(
      [
        "## Dados da empresa",
        c.tradeName && `Nome: ${c.tradeName}`,
        c.description && `Sobre: ${c.description}`,
        c.mission && `Missão: ${c.mission}`,
        c.differentials && `Diferenciais: ${c.differentials}`,
        c.phone && `Telefone: ${c.phone}`,
        c.email && `E-mail: ${c.email}`,
        c.website && `Site: ${c.website}`,
        (c.address || c.city) &&
          `Endereço: ${[c.address, c.city, c.state].filter(Boolean).join(" — ")}`,
        c.businessHours && `Horários (JSON): ${c.businessHours}`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  if (ctx.agent.useKnowledge && ctx.knowledge.length) {
    parts.push(
      "## Base de conhecimento\n" +
        ctx.knowledge
          .map((k) => `### [${k.category}] ${k.title}\n${k.content}`)
          .join("\n\n")
    );
  }

  if (ctx.agent.useCatalog) {
    if (ctx.services.length) {
      parts.push(
        "## Serviços e preços\n" +
          ctx.services
            .map((s) => {
              const priceLabel =
                s.priceType === "from"
                  ? `a partir de ${formatMoney(s.price, s.currency)}`
                  : s.priceType === "hourly"
                    ? `${formatMoney(s.price, s.currency)}/hora`
                    : s.priceType === "quote"
                      ? "sob consulta"
                      : formatMoney(s.price, s.currency);
              return `- ${s.name}: ${priceLabel}${s.durationMin ? ` (${s.durationMin} min)` : ""}${s.description ? ` — ${s.description}` : ""}`;
            })
            .join("\n")
      );
    }

    if (ctx.products.length) {
      parts.push(
        "## Produtos e preços\n" +
          ctx.products
            .map((p) => {
              const stock = p.inStock ? "em estoque" : "indisponível";
              return `- ${p.name}: ${formatMoney(p.price, p.currency)} (${stock})${p.description ? ` — ${p.description}` : ""}`;
            })
            .join("\n")
      );
    }
  }

  if (ctx.agent.handoffEnabled) {
    parts.push(
      "Se o cliente pedir atendente humano, reclamar com irritação ou usar palavras de transferência, responda educadamente que vai transferir e termine a mensagem com a tag [HANDOFF]."
    );
  }

  return parts.join("\n\n");
}

export async function loadAgentContext(tenantId: string, agentId: string) {
  const [agent, company, knowledge, products, services] = await Promise.all([
    prisma.agent.findFirst({ where: { id: agentId, tenantId } }),
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.knowledgeItem.findMany({
      where: { tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      take: 80,
    }),
    prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      take: 80,
    }),
  ]);

  if (!agent) throw new Error("Agente não encontrado");

  return {
    agent,
    company,
    knowledge,
    products,
    services,
  } satisfies AgentContext;
}

export function shouldHandoff(text: string, keywordsJson: string | null) {
  const defaults = [
    "atendente",
    "humano",
    "pessoa real",
    "falar com alguém",
    "reclamação",
    "gerente",
  ];
  let keywords = defaults;
  if (keywordsJson) {
    try {
      const parsed = JSON.parse(keywordsJson);
      if (Array.isArray(parsed) && parsed.length) keywords = parsed;
    } catch {
      /* keep defaults */
    }
  }
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(String(k).toLowerCase()));
}

export async function generateAgentReply(params: {
  tenantId: string;
  agentId: string;
  history: { role: "user" | "assistant" | "system"; content: string }[];
  userMessage: string;
}) {
  const ctx = await loadAgentContext(params.tenantId, params.agentId);
  const system = buildSystemPrompt(ctx);

  if (shouldHandoff(params.userMessage, ctx.agent.handoffKeywords)) {
    return {
      content:
        ctx.agent.fallbackMessage ||
        "Vou transferir você para um atendente humano. Um momento, por favor.",
      handoff: true,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      content:
        "Recebi sua mensagem. (Modo demo: configure OPENAI_API_KEY para respostas com IA.) Como posso ajudar com nossos serviços ou preços?",
      handoff: false,
      demo: true,
    };
  }

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: ctx.agent.model,
    temperature: ctx.agent.temperature,
    max_tokens: ctx.agent.maxTokens,
    messages: [
      { role: "system", content: system },
      ...params.history.slice(-20),
      { role: "user", content: params.userMessage },
    ],
  });

  let content =
    completion.choices[0]?.message?.content?.trim() ||
    "Desculpe, não consegui gerar uma resposta agora.";

  const handoff = content.includes("[HANDOFF]");
  content = content.replace(/\[HANDOFF\]/g, "").trim();

  return { content, handoff, demo: false };
}
