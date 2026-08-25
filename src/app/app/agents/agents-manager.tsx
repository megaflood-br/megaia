"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Agent = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  roleTitle: string | null;
  personality: string | null;
  systemPrompt: string | null;
  welcomeMessage: string | null;
  fallbackMessage: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  handoffEnabled: boolean;
  useKnowledge: boolean;
  useCatalog: boolean;
};

export function AgentsManager({ initialAgents }: { initialAgents: Agent[] }) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [selectedId, setSelectedId] = useState(initialAgents[0]?.id || "");
  const selected = agents.find((a) => a.id === selectedId) || null;
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; content: string }[]>(
    []
  );
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [chatLoading, setChatLoading] = useState(false);

  async function createAgent() {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Agente ${agents.length + 1}`,
        avatarEmoji: "🤖",
        roleTitle: "Atendimento",
        personality: "Cordial e objetivo",
        welcomeMessage: "Olá! Como posso ajudar?",
      }),
    });
    if (!res.ok) return;
    const agent = await res.json();
    setAgents((prev) => [agent, ...prev]);
    setSelectedId(agent.id);
    router.refresh();
  }

  async function saveAgent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/agents/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        avatarEmoji: form.get("avatarEmoji"),
        avatarUrl: form.get("avatarUrl") || null,
        roleTitle: form.get("roleTitle"),
        personality: form.get("personality"),
        systemPrompt: form.get("systemPrompt"),
        welcomeMessage: form.get("welcomeMessage"),
        fallbackMessage: form.get("fallbackMessage"),
        model: form.get("model"),
        temperature: Number(form.get("temperature")),
        maxTokens: Number(form.get("maxTokens")),
        isActive: form.get("isActive") === "on",
        handoffEnabled: form.get("handoffEnabled") === "on",
        useKnowledge: form.get("useKnowledge") === "on",
        useCatalog: form.get("useCatalog") === "on",
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("Erro ao salvar");
      return;
    }
    const updated = await res.json();
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setMsg("Salvo");
    router.refresh();
  }

  async function sendTest() {
    if (!selected || !chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput("");
    setChatLog((prev) => [...prev, { role: "user", content: message }]);
    setChatLoading(true);
    const res = await fetch("/api/chat/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: selected.id,
        message,
        conversationId,
      }),
    });
    setChatLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", content: data.error || "Erro" },
      ]);
      return;
    }
    setConversationId(data.conversationId);
    setChatLog((prev) => [
      ...prev,
      { role: "assistant", content: data.message.content },
    ]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="surface p-3">
        <button onClick={createAgent} className="btn btn-primary mb-3 w-full">
          Novo agente
        </button>
        <div className="space-y-1">
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelectedId(a.id);
                setChatLog([]);
                setConversationId(undefined);
                setMsg("");
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                a.id === selectedId
                  ? "bg-[var(--mint-soft)] font-semibold"
                  : "hover:bg-[var(--sand)]"
              }`}
            >
              <span className="text-lg">{a.avatarEmoji || "🤖"}</span>
              <span className="truncate">{a.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {selected ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={saveAgent} className="surface space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mint-soft)] text-3xl">
                {selected.avatarEmoji || "🤖"}
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {selected.name}
                </h2>
                <p className="text-sm text-[var(--ink-soft)]/60">/{selected.slug}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nome</label>
                <input
                  name="name"
                  className="input"
                  defaultValue={selected.name}
                  key={selected.id + "-name"}
                  required
                />
              </div>
              <div>
                <label className="label">Emoji do avatar</label>
                <input
                  name="avatarEmoji"
                  className="input"
                  defaultValue={selected.avatarEmoji || ""}
                  key={selected.id + "-emoji"}
                />
              </div>
            </div>

            <div>
              <label className="label">URL do avatar (opcional)</label>
              <input
                name="avatarUrl"
                className="input"
                placeholder="https://…"
                defaultValue={selected.avatarUrl || ""}
                key={selected.id + "-url"}
              />
            </div>

            <div>
              <label className="label">Função</label>
              <input
                name="roleTitle"
                className="input"
                defaultValue={selected.roleTitle || ""}
                key={selected.id + "-role"}
              />
            </div>

            <div>
              <label className="label">Personalidade / tom</label>
              <textarea
                name="personality"
                className="textarea"
                defaultValue={selected.personality || ""}
                key={selected.id + "-pers"}
              />
            </div>

            <div>
              <label className="label">System prompt</label>
              <textarea
                name="systemPrompt"
                className="textarea"
                defaultValue={selected.systemPrompt || ""}
                key={selected.id + "-sys"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Mensagem de boas-vindas</label>
                <textarea
                  name="welcomeMessage"
                  className="textarea"
                  defaultValue={selected.welcomeMessage || ""}
                  key={selected.id + "-welcome"}
                />
              </div>
              <div>
                <label className="label">Mensagem de handoff</label>
                <textarea
                  name="fallbackMessage"
                  className="textarea"
                  defaultValue={selected.fallbackMessage || ""}
                  key={selected.id + "-fb"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Modelo</label>
                <select
                  name="model"
                  className="input"
                  defaultValue={selected.model}
                  key={selected.id + "-model"}
                >
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                </select>
              </div>
              <div>
                <label className="label">Temperatura</label>
                <input
                  name="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  className="input"
                  defaultValue={selected.temperature}
                  key={selected.id + "-temp"}
                />
              </div>
              <div>
                <label className="label">Max tokens</label>
                <input
                  name="maxTokens"
                  type="number"
                  className="input"
                  defaultValue={selected.maxTokens}
                  key={selected.id + "-tokens"}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {[
                ["isActive", "Ativo", selected.isActive],
                ["handoffEnabled", "Handoff humano", selected.handoffEnabled],
                ["useKnowledge", "Usar conhecimento", selected.useKnowledge],
                ["useCatalog", "Usar catálogo", selected.useCatalog],
              ].map(([name, label, checked]) => (
                <label key={name as string} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={name as string}
                    defaultChecked={Boolean(checked)}
                    key={selected.id + String(name)}
                  />
                  {label as string}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar agente"}
              </button>
              {msg && <span className="text-sm text-[var(--ok)]">{msg}</span>}
            </div>
          </form>

          <div className="surface flex min-h-[520px] flex-col p-6">
            <h3 className="font-display text-lg font-semibold">Testar no painel</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]/60">
              Simula o atendimento sem WhatsApp. Use a mesma base de conhecimento e preços.
            </p>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl bg-[var(--sand)]/60 p-4">
              {chatLog.length === 0 && (
                <p className="text-sm text-[var(--ink-soft)]/50">
                  {selected.welcomeMessage || "Envie uma mensagem para começar."}
                </p>
              )}
              {chatLog.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-[var(--ink)] text-white"
                      : "bg-white text-[var(--ink)]"
                  }`}
                >
                  {m.content}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                className="input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ex: quanto custa a consulta?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendTest();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-accent shrink-0"
                onClick={sendTest}
                disabled={chatLoading}
              >
                {chatLoading ? "…" : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="surface p-8 text-sm text-[var(--ink-soft)]/60">
          Crie seu primeiro agente para começar.
        </div>
      )}
    </div>
  );
}
