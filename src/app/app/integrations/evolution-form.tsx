"use client";

import { FormEvent, useState } from "react";

type Config = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookSecret: string | null;
  isConnected: boolean;
  webhookUrl?: string;
} | null;

export function EvolutionForm({
  initial,
  tenantSlug,
  appUrl,
}: {
  initial: Config;
  tenantSlug: string;
  appUrl: string;
}) {
  const webhookUrl =
    initial?.webhookUrl || `${appUrl}/api/webhooks/evolution/${tenantSlug}`;
  const [msg, setMsg] = useState("");
  const [connected, setConnected] = useState(initial?.isConnected ?? false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/integrations/evolution", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUrl: form.get("apiUrl"),
        apiKey: form.get("apiKey"),
        instanceName: form.get("instanceName"),
        webhookSecret: form.get("webhookSecret") || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Erro ao salvar");
      return;
    }
    setConnected(Boolean(data.isConnected));
    setMsg(
      data.isConnected
        ? "Salvo — instância conectada"
        : "Salvo — instância ainda não conectada (verifique QR/session na Evolution)"
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={onSubmit} className="surface space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">Evolution API</h2>
        <p className="text-sm text-[var(--ink-soft)]/70">
          Conecte sua instância WhatsApp. O Nexo recebe mensagens no webhook e
          responde com o agente ativo + OpenAI.
        </p>
        <div>
          <label className="label">URL da API</label>
          <input
            name="apiUrl"
            className="input"
            placeholder="https://evolution.suaempresa.com"
            defaultValue={initial?.apiUrl || ""}
            required
          />
        </div>
        <div>
          <label className="label">API Key</label>
          <input
            name="apiKey"
            className="input"
            placeholder={
              initial?.apiKey?.startsWith("••••")
                ? "Deixe em branco para manter a atual"
                : "sua-api-key"
            }
            defaultValue=""
            required={!initial}
          />
          {initial?.apiKey?.startsWith("••••") && (
            <p className="mt-1 text-xs text-[var(--ink-soft)]/50">
              Chave mascarada salva: {initial.apiKey}. Informe novamente só se quiser trocar.
            </p>
          )}
        </div>
        <div>
          <label className="label">Nome da instância</label>
          <input
            name="instanceName"
            className="input"
            defaultValue={initial?.instanceName || ""}
            required
          />
        </div>
        <div>
          <label className="label">Webhook secret (opcional)</label>
          <input
            name="webhookSecret"
            className="input"
            defaultValue={initial?.webhookSecret || ""}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar integração"}
          </button>
          <span
            className={`text-sm font-semibold ${
              connected ? "text-[var(--ok)]" : "text-[var(--warn)]"
            }`}
          >
            {connected ? "Conectado" : "Desconectado"}
          </span>
        </div>
        {msg && <p className="text-sm text-[var(--ink-soft)]">{msg}</p>}
      </form>

      <div className="space-y-4">
        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">Webhook</h3>
          <p className="mt-2 break-all rounded-xl bg-[var(--sand)] p-3 font-mono text-xs">
            {webhookUrl}
          </p>
          <p className="mt-3 text-sm text-[var(--ink-soft)]/70">
            Na Evolution, aponte o webhook da instância para este URL e habilite
            o evento <strong>MESSAGES_UPSERT</strong>.
          </p>
        </div>
        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">OpenAI</h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]/70">
            Configure <code className="rounded bg-[var(--sand)] px-1">OPENAI_API_KEY</code>{" "}
            no ambiente do servidor. Sem a chave, o chat de teste funciona em
            modo demo.
          </p>
        </div>
      </div>
    </div>
  );
}
