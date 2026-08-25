"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Config = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookSecret: string | null;
  isConnected: boolean;
  webhookUrl?: string;
} | null;

type ConnState = "open" | "connecting" | "close" | "unknown";

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

  const [hasConfig, setHasConfig] = useState(Boolean(initial));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(initial?.isConnected ?? false);
  const [state, setState] = useState<ConnState>(
    initial?.isConnected ? "open" : "close"
  );
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyStatus = useCallback(
    (data: {
      state?: ConnState;
      isConnected?: boolean;
      qr?: string | null;
      pairingCode?: string | null;
    }) => {
      if (data.state) setState(data.state);
      if (typeof data.isConnected === "boolean") setConnected(data.isConnected);
      if (data.qr) setQr(data.qr);
      if (data.pairingCode) setPairingCode(data.pairingCode);

      if (data.state === "open" || data.isConnected) {
        setQr(null);
        setPairingCode(null);
        setMsg("WhatsApp conectado");
        stopPolling();
      }
    },
    [stopPolling]
  );

  const pollStatus = useCallback(
    async (withQr = false) => {
      const res = await fetch(
        `/api/integrations/evolution/status${withQr ? "?qr=1" : ""}`
      );
      const data = await res.json();
      if (!res.ok) return;
      applyStatus(data);
    },
    [applyStatus]
  );

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void pollStatus(true);
    }, 3000);
  }, [pollStatus, stopPolling]);

  useEffect(() => {
    if (!hasConfig) return;
    const timer = setTimeout(() => {
      void pollStatus(false);
    }, 0);
    return () => {
      clearTimeout(timer);
      stopPolling();
    };
  }, [hasConfig, pollStatus, stopPolling]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
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
      setError(data.error || "Erro ao salvar");
      return;
    }
    setHasConfig(true);
    setConnected(Boolean(data.isConnected));
    setState(data.isConnected ? "open" : "close");
    setMsg(
      data.isConnected
        ? "Credenciais salvas — WhatsApp já conectado"
        : "Credenciais salvas. Clique em Conectar WhatsApp para gerar o QR Code."
    );
  }

  async function connectWhatsApp() {
    setConnecting(true);
    setError("");
    setMsg("Gerando QR Code…");
    setQr(null);
    setPairingCode(null);

    const res = await fetch("/api/integrations/evolution/connect", {
      method: "POST",
    });
    const data = await res.json();
    setConnecting(false);

    if (!res.ok) {
      setError(data.error || "Falha ao conectar");
      setMsg("");
      return;
    }

    applyStatus({
      state: data.state,
      isConnected: data.state === "open",
      qr: data.qr,
      pairingCode: data.pairingCode,
    });
    setMsg(data.message || "");

    if (data.state !== "open") {
      startPolling();
    }
  }

  async function refreshQr() {
    setConnecting(true);
    setError("");
    await pollStatus(true);
    setConnecting(false);
    setMsg("QR Code atualizado");
    startPolling();
  }

  async function disconnectWhatsApp() {
    setConnecting(true);
    setError("");
    const res = await fetch("/api/integrations/evolution/disconnect", {
      method: "POST",
    });
    const data = await res.json();
    setConnecting(false);
    if (!res.ok) {
      setError(data.error || "Falha ao desconectar");
      return;
    }
    stopPolling();
    setConnected(false);
    setState("close");
    setQr(null);
    setPairingCode(null);
    setMsg("WhatsApp desconectado");
  }

  const statusLabel =
    state === "open"
      ? "Conectado"
      : state === "connecting"
        ? "Aguardando leitura do QR"
        : state === "close"
          ? "Desconectado"
          : "Status desconhecido";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={onSubmit} className="surface space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">Evolution API</h2>
        <p className="text-sm text-[var(--ink-soft)]/70">
          Salve as credenciais do servidor Evolution e conecte o WhatsApp pelo
          QR Code aqui no painel.
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
              Chave mascarada salva: {initial.apiKey}. Informe novamente só se
              quiser trocar.
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
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar credenciais"}
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
        {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
      </form>

      <div className="space-y-4">
        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">
            Conectar WhatsApp
          </h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]/70">
            Abra o WhatsApp no celular → Dispositivos conectados → Conectar
            dispositivo e escaneie o QR abaixo.
          </p>

          {!hasConfig ? (
            <p className="mt-4 text-sm text-[var(--warn)]">
              Salve as credenciais da Evolution para liberar a conexão.
            </p>
          ) : connected ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-[var(--mint-soft)] px-4 py-5 text-center">
                <p className="font-display text-lg font-semibold text-[var(--teal-deep)]">
                  WhatsApp conectado
                </p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]/70">
                  A instância está pronta para receber e enviar mensagens.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger w-full"
                onClick={disconnectWhatsApp}
                disabled={connecting}
              >
                Desconectar
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--sand)]/50 p-4">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr}
                    alt="QR Code WhatsApp"
                    className="h-[220px] w-[220px] rounded-xl bg-white p-2 shadow-sm"
                  />
                ) : (
                  <p className="max-w-[220px] text-center text-sm text-[var(--ink-soft)]/55">
                    {connecting
                      ? "Gerando QR Code…"
                      : "Clique em Conectar WhatsApp para gerar o QR Code"}
                  </p>
                )}
              </div>

              {pairingCode && (
                <p className="text-center text-sm">
                  Código de pareamento:{" "}
                  <span className="font-mono font-semibold tracking-wider">
                    {pairingCode}
                  </span>
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-accent flex-1"
                  onClick={connectWhatsApp}
                  disabled={connecting}
                >
                  {connecting ? "Conectando…" : qr ? "Gerar novo QR" : "Conectar WhatsApp"}
                </button>
                {qr && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={refreshQr}
                    disabled={connecting}
                  >
                    Atualizar
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--ink-soft)]/50">
                O QR expira em cerca de 1 minuto. Use Atualizar se não conseguir
                escanear a tempo.
              </p>
            </div>
          )}
        </div>

        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">Webhook</h3>
          <p className="mt-2 break-all rounded-xl bg-[var(--sand)] p-3 font-mono text-xs">
            {webhookUrl}
          </p>
          <p className="mt-3 text-sm text-[var(--ink-soft)]/70">
            Ao conectar, o Nexo tenta registrar este webhook automaticamente na
            Evolution (evento <strong>MESSAGES_UPSERT</strong>).
          </p>
        </div>

        <div className="surface p-6">
          <h3 className="font-display text-lg font-semibold">OpenAI</h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]/70">
            Configure{" "}
            <code className="rounded bg-[var(--sand)] px-1">OPENAI_API_KEY</code>{" "}
            no ambiente do servidor. Sem a chave, o chat de teste funciona em
            modo demo.
          </p>
        </div>
      </div>
    </div>
  );
}
