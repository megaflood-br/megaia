"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CONTACT_STAGES, displayPhone, stageLabel } from "@/lib/crm";
import { relativeTime } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  stage: string;
  tags: string;
  conversationCount: number;
  lastConversation: { id: string; lastMessageAt: string; status: string } | null;
};

export function CrmBoard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ total: 0 });
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stage) params.set("stage", stage);
    const qs = params.toString();
    fetch(`/api/contacts${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.contacts) return;
        setRows(data.contacts);
        if (data.counts) setCounts(data.counts);
      })
      .catch(() => {});
  }, [q, stage]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone") || null,
        email: form.get("email") || null,
        company: form.get("company") || null,
        stage: form.get("stage") || "lead",
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Não foi possível criar");
      return;
    }
    e.currentTarget.reset();
    load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">CRM</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Contatos vinculados ao inbox. WhatsApp cria a ficha pelo telefone; você
          completa nome, documentos, estágio e notas.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${stage === "" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setStage("")}
        >
          Todos <span className="ml-1 opacity-70">{counts.total || 0}</span>
        </button>
        {CONTACT_STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn ${stage === s.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStage(s.id)}
          >
            {s.label}
            <span className="ml-1 opacity-70">{counts[s.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <input
            className="input"
            placeholder="Buscar nome, telefone, e-mail, empresa…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="surface divide-y divide-[var(--line)]">
            {rows.length === 0 && (
              <p className="p-6 text-sm text-[var(--ink-soft)]/60">
                Nenhum contato ainda. Abra uma conversa no inbox ou cadastre aqui.
              </p>
            )}
            {rows.map((c) => (
              <Link
                key={c.id}
                href={`/app/crm/${c.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--sand)]/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name || "Contato"}</p>
                  <p className="truncate text-sm text-[var(--ink-soft)]/60">
                    {[displayPhone(c.phone) || c.phone, c.company, c.email]
                      .filter(Boolean)
                      .join(" · ") || "Sem dados extras"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded-full bg-[var(--mint-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--teal-deep)]">
                    {stageLabel(c.stage)}
                  </span>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]/45">
                    {c.conversationCount} conv.
                    {c.lastConversation
                      ? ` · ${relativeTime(c.lastConversation.lastMessageAt)}`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <form onSubmit={onCreate} className="surface h-fit space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Novo contato</h2>
          <div>
            <label className="label">Nome</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input name="phone" className="input" placeholder="5511999999999" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" className="input" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input name="company" className="input" />
          </div>
          <div>
            <label className="label">Estágio</label>
            <select name="stage" className="input" defaultValue="lead">
              {CONTACT_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Salvando…" : "Cadastrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
