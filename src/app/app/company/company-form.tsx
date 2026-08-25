"use client";

import { FormEvent, useState } from "react";

type Profile = {
  tradeName: string | null;
  legalName: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  description: string | null;
  mission: string | null;
  differentials: string | null;
  businessHours: string | null;
  timezone: string;
} | null;

export function CompanyForm({ initial }: { initial: Profile }) {
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setMsg(res.ok ? "Empresa atualizada" : "Erro ao salvar");
  }

  const p = initial;

  return (
    <form onSubmit={onSubmit} className="surface max-w-3xl space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome fantasia</label>
          <input name="tradeName" className="input" defaultValue={p?.tradeName || ""} />
        </div>
        <div>
          <label className="label">Razão social</label>
          <input name="legalName" className="input" defaultValue={p?.legalName || ""} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">CNPJ / documento</label>
          <input name="document" className="input" defaultValue={p?.document || ""} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="phone" className="input" defaultValue={p?.phone || ""} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">E-mail</label>
          <input name="email" className="input" defaultValue={p?.email || ""} />
        </div>
        <div>
          <label className="label">Site</label>
          <input name="website" className="input" defaultValue={p?.website || ""} />
        </div>
      </div>
      <div>
        <label className="label">Endereço</label>
        <input name="address" className="input" defaultValue={p?.address || ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Cidade</label>
          <input name="city" className="input" defaultValue={p?.city || ""} />
        </div>
        <div>
          <label className="label">UF</label>
          <input name="state" className="input" defaultValue={p?.state || ""} />
        </div>
        <div>
          <label className="label">CEP</label>
          <input name="zipCode" className="input" defaultValue={p?.zipCode || ""} />
        </div>
      </div>
      <div>
        <label className="label">Sobre a empresa</label>
        <textarea
          name="description"
          className="textarea"
          defaultValue={p?.description || ""}
        />
      </div>
      <div>
        <label className="label">Missão</label>
        <textarea name="mission" className="textarea" defaultValue={p?.mission || ""} />
      </div>
      <div>
        <label className="label">Diferenciais</label>
        <textarea
          name="differentials"
          className="textarea"
          defaultValue={p?.differentials || ""}
        />
      </div>
      <div>
        <label className="label">Horários (JSON)</label>
        <textarea
          name="businessHours"
          className="textarea font-mono text-xs"
          defaultValue={p?.businessHours || ""}
          placeholder='{"mon":{"open":"08:00","close":"18:00"}}'
        />
      </div>
      <div>
        <label className="label">Timezone</label>
        <input
          name="timezone"
          className="input"
          defaultValue={p?.timezone || "America/Sao_Paulo"}
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar empresa"}
        </button>
        {msg && <span className="text-sm text-[var(--ok)]">{msg}</span>}
      </div>
    </form>
  );
}
