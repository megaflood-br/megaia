# Nexo

Plataforma **multitenant** para agentes de IA de atendimento, com:

- **OpenAI** — respostas contextuais por tenant/agente
- **Evolution API** — WhatsApp (webhook + envio de texto)
- **Avatar e personalidade** do agente
- **Dados da empresa** consultáveis
- **Catálogo** de produtos e serviços com preços
- **Base de conhecimento** (FAQ, políticas, processos)
- **Handoff** para humano
- **Chat de teste** no painel

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma 7 + SQLite (troque para Postgres em produção)
- Auth por sessão (cookie httpOnly)

## Setup rápido

```bash
npm install
cp .env.example .env
# edite OPENAI_API_KEY e APP_URL
npm run db:setup
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

**Demo seed:** `demo@nexo.app` / `demo1234`

## Evolution API

1. Em **Integrações**, informe URL, API key e nome da instância
2. Configure o webhook da Evolution para:

```
{APP_URL}/api/webhooks/evolution/{tenantSlug}
```

3. Evento recomendado: `MESSAGES_UPSERT`

## Modelo de tenant

Cada empresa (`Tenant`) isola:

| Recurso | Uso do agente |
|--------|----------------|
| CompanyProfile | Nome, endereço, horários, diferenciais |
| KnowledgeItem | FAQs e políticas |
| Product / Service | Tabela de preços |
| Agent | Prompt, avatar, modelo, flags |
| EvolutionConfig | Credenciais WhatsApp |
| Conversation / Message | Histórico |

## Sugestões além do MVP

- Embeddings + RAG real (pgvector) para bases grandes
- Agendamento / CRM (Google Calendar, Pipedrive)
- Multi-agente por fila ou specialty routing
- Métricas de CSAT e tempo de resposta
- Respostas com mídia (áudio/imagem) via Evolution
- Roles granulares e audit log
- Billing por plano (starter/pro/business)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server |
| `npm run build` | Build produção |
| `npm run db:setup` | Push schema + seed |
| `npm run db:seed` | Re-seed demo |
