"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  CONTACT_STAGES,
  type CustomField,
  displayPhone,
  parseTags,
  stageLabel,
} from "@/lib/crm";

export type ContactPayload = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  company: string | null;
  stage: string;
  tags: string;
  notes: string;
  source: string;
  fields: CustomField[];
};

type Props = {
  contact: ContactPayload;
  compact?: boolean;
  onSaved?: (contact: ContactPayload) => void;
  onDeleted?: () => void;
};

export function ContactCard({ contact, compact, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState(contact);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    setForm(contact);
  }, [contact.id]);

  function setField<K extends keyof ContactPayload>(key: K, value: ContactPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setExtra(index: number, patch: Partial<CustomField>) {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        email: form.email,
        document: form.document,
        company: form.company,
        stage: form.stage,
        tags: form.tags,
        notes: form.notes,
        fields: form.fields,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Não foi possível salvar");
      return;
    }
    const updated = (await res.json()) as ContactPayload;
    setForm(updated);
    setSavedAt("Salvo");
    onSaved?.(updated);
  }

  async function remove() {
    if (!confirm("Excluir este contato do CRM? As conversas continuam no inbox.")) {
      return;
    }
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível excluir");
      return;
    }
    onDeleted?.();
  }

  return (
    <form onSubmit={onSubmit} className="surface h-fit space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">CRM</h2>
          <p className="text-xs text-[var(--ink-soft)]/55">
            {displayPhone(form.phone) || "Sem telefone"} · {stageLabel(form.stage)}
          </p>
        </div>
        {!compact && (
          <button type="button" className="btn btn-danger px-3 py-1 text-xs" onClick={remove}>
            Excluir
          </button>
        )}
      </div>

      <div>
        <label className="label">Nome</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Telefone</label>
          <input
            className="input"
            value={form.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value || null)}
            placeholder="5511999999999"
          />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value || null)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Documento</label>
          <input
            className="input"
            value={form.document ?? ""}
            onChange={(e) => setField("document", e.target.value || null)}
            placeholder="CPF ou CNPJ"
          />
        </div>
        <div>
          <label className="label">Empresa</label>
          <input
            className="input"
            value={form.company ?? ""}
            onChange={(e) => setField("company", e.target.value || null)}
          />
        </div>
      </div>
      <div>
        <label className="label">Estágio</label>
        <select
          className="input"
          value={form.stage}
          onChange={(e) => setField("stage", e.target.value)}
        >
          {CONTACT_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tags (vírgula)</label>
        <input
          className="input"
          value={form.tags}
          onChange={(e) => setField("tags", e.target.value)}
          placeholder="vip, pix, retorno"
        />
        {parseTags(form.tags).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {parseTags(form.tags).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--mint-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--teal-deep)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="label">Notas internas</label>
        <textarea
          className="textarea"
          style={{ minHeight: compact ? 80 : 110 }}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Preferências, histórico, o que não pode esquecer…"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label mb-0">Campos extras</label>
          <button
            type="button"
            className="text-xs font-semibold text-[var(--teal)]"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                fields: [...prev.fields, { label: "", value: "" }],
              }))
            }
          >
            + campo
          </button>
        </div>
        {form.fields.length === 0 && (
          <p className="text-xs text-[var(--ink-soft)]/50">
            Ex.: convênio, unidade, responsável.
          </p>
        )}
        {form.fields.map((field, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="input"
              placeholder="Rótulo"
              value={field.label}
              onChange={(e) => setExtra(index, { label: e.target.value })}
            />
            <input
              className="input"
              placeholder="Valor"
              value={field.value}
              onChange={(e) => setExtra(index, { value: e.target.value })}
            />
            <button
              type="button"
              className="btn btn-ghost px-3"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  fields: prev.fields.filter((_, i) => i !== index),
                }))
              }
              aria-label="Remover campo"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
      {savedAt && !error && (
        <p className="text-sm text-[var(--ok)]">{savedAt}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar contato"}
        </button>
        {compact && (
          <Link href={`/app/crm/${contact.id}`} className="btn btn-ghost">
            Abrir no CRM
          </Link>
        )}
      </div>
    </form>
  );
}
