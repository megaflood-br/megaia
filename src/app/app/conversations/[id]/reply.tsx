"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ConversationReply({
  conversationId,
  channel,
  closed,
}: {
  conversationId: string;
  channel: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setSending(false);
    if (data.message) setText("");
    if (!res.ok || data.error) {
      setError(data.error || "Não foi possível enviar");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 p-4">
      <label className="label">Responder como atendente</label>
      <textarea
        className="textarea"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          channel === "whatsapp"
            ? "A mensagem vai para o WhatsApp do cliente e a IA pausa."
            : "A mensagem entra no histórico desta conversa de teste."
        }
        disabled={sending}
      />
      {closed && (
        <p className="text-xs text-[var(--ink-soft)]/60">
          Esta conversa está encerrada. Enviar reabre como handoff (IA pausada).
        </p>
      )}
      {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={sending || !text.trim()}
      >
        {sending ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
