"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Config = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookSecret: string | null;
  isConnected: boolean;
  webhookUrl?: string;
} | null;

type LiveState = "unconfigured" | "open" | "connecting" | "close" | "unknown" | "error";

export function EvolutionForm({
  initial,
  tenantSlug,
  appUrl,
  defaults,
}: {
  initial: Config;
  tenantSlug: string;
  appUrl: string;
  defaults?: { apiUrl?: string; instanceName?: string };
}) {
  const webhookUrl =
    initial?.webhookUrl || `${appUrl}/api/webhooks/evolution/${tenantSlug}`;
  const [msg, setMsg] = useState("");
  const [connected, setConnected] = useState(initial?.isConnected ?? false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hasConfig, setHasConfig] = useState(Boolean(initial));
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>(
    initial?.isConnected ? "open" : initial ? "close" : "unconfigured"
  );
  const pollRef = useRef<number | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function refreshStatus() {
    const res = await fetch("/api/integrations/evolution/status");
    const data = await res.json();
    if (data.state === "open") {
      setConnected(true);
      setLiveState("open");
      setQr(null);
      setPairingCode(null);
      stopPolling();
      return data;
    }
    setConnected(false);
    setLiveState((data.state as LiveState) || "unknown");
    if (data.qrBase64) setQr(data.qrBase64);
    if (data.pairingCode) setPairingCode(data.pairingCode);
    return data;
  }

  function startPolling() {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      refreshStatus().catch(() => {});
    }, 2500);
  }

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
    setHasConfig(true);
    setConnected(Boolean(data.isConnected));
    setLiveState(data.isConnected ? "open" : "close");
    setMsg(
      data.isConnected
        ? "Salvo — WhatsApp já conectado"
        : "Salvo. Clique em Conectar WhatsApp para escanear o QR aqui."
    );
  }

  async function connect() {
    setConnecting(true);
    setMsg("");
    const res = await fetch("/api/integrations/evolution/connect", {
      method: "POST",
    });
    const data = await res.json();
    setConnecting(false);
    if (!res.ok) {
      setMsg(data.error || "Não foi possível criar/conectar a instância");
      setLiveState("error");
      return;
    }
    if (data.state === "open") {
      setConnected(true);
      setLiveState("open");
      setQr(null);
      setMsg("WhatsApp conectado.");
      return;
    }
    setConnected(false);
    setLiveState("connecting");
    setQr(data.qrBase64 || null);
    setPairingCode(data.pairingCode || null);
    setMsg(
      data.qrBase64
        ? "Escaneie o QR no WhatsApp: Aparelhos conectados → Conectar um aparelho."
        : "Aguardando QR da Evolution…"
    );
    startPolling();
  }

  async function logout() {
    setConnecting(true);
    setMsg("");
    const res = await fetch("/api/integrations/evolution/logout", {
      method: "POST",
    });
    const data = await res.json();
    setConnecting(false);
    if (!res.ok) {
      setMsg(data.error || "Falha ao desconectar");
      return;
    }
    stopPolling();
    setConnected(false);
    setLiveState("close");
    setQr(null);
    setPairingCode(null);
    setMsg("WhatsApp desconectado. Conecte de novo para gerar um novo QR.");
  }

  const statusLabel =
    liveState === "open"
      ? "Conectado"
      : liveState === "connecting"
        ? "Aguardando leitura do QR"
        : liveState === "error"
          ? "Erro"
          : "Desconectado";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={onSubmit} className="surface space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">Evolution API</h2>
        <p className="text-sm text-[var(--ink-soft)]/70">
          Informe só a URL e a chave da sua Evolution. O Nexo cria a instância,
          configura o webhook e mostra o QR para conectar o WhatsApp — sem abrir
          o painel da Evolution.
        </p>
        <div>
          <label className="label">URL da API</label>
          <input
            name="apiUrl"
            className="input"
            placeholder="https://evolution.suaempresa.com"
            defaultValue={initial?.apiUrl || defaults?.apiUrl || ""}
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
            defaultValue={
              initial?.instanceName || defaults?.instanceName || tenantSlug
            }
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
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar integração"}
          </button>
          <span
            className={`text-sm font-semibold ${
              connected ? "text-[var(--ok)]" : "text-[var(--warn)]"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {msg && <p className="text-sm text-[var(--ink-soft)]">{msg}</p>}
      </form>

      <div className="space-y-4">
        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">Conectar WhatsApp</h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]/70">
            O QR aparece aqui. No celular: WhatsApp → Aparelhos conectados →
            Conectar um aparelho.
          </p>
          {qr ? (
            // QR is a data: URI from Evolution — next/image cannot optimize it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="QR Code WhatsApp"
              className="mx-auto mt-4 h-56 w-56 rounded-xl border border-[var(--line)] bg-white p-2"
            />
          ) : (
            <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--sand)] text-center text-sm text-[var(--ink-soft)]/60">
              {connected
                ? "Sessão ativa. Não é necessário escanear."
                : "Clique em Conectar WhatsApp para gerar o QR."}
            </div>
          )}
          {pairingCode && (
            <p className="mt-3 text-center text-sm">
              Código de pareamento:{" "}
              <strong className="font-mono tracking-widest">{pairingCode}</strong>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-accent"
              disabled={!hasConfig || connecting || connected}
              onClick={connect}
            >
              {connecting ? "Gerando QR…" : "Conectar WhatsApp"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasConfig || connecting}
              onClick={() => {
                refreshStatus().catch(() => {});
                startPolling();
              }}
            >
              Atualizar status
            </button>
            {connected && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={connecting}
                onClick={logout}
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">Webhook</h3>
          <p className="mt-2 break-all rounded-xl bg-[var(--sand)] p-3 font-mono text-xs">
            {webhookUrl}
          </p>
          <p className="mt-3 text-sm text-[var(--ink-soft)]/70">
            Configurado automaticamente ao salvar ou conectar. Eventos:{" "}
            <strong>MESSAGES_UPSERT</strong> e <strong>CONNECTION_UPDATE</strong>.
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
