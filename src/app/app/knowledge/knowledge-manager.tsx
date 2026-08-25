"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string | null;
  isActive: boolean;
};

export function KnowledgeManager({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        category: form.get("category"),
        content: form.get("content"),
        tags: form.get("tags"),
      }),
    });
    if (!res.ok) {
      setError("Erro ao criar item");
      return;
    }
    const item = await res.json();
    setItems((prev) => [item, ...prev]);
    e.currentTarget.reset();
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={onCreate} className="surface h-fit space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Novo item</h2>
        <div>
          <label className="label">Título</label>
          <input name="title" className="input" required />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select name="category" className="input" defaultValue="faq">
            <option value="empresa">Empresa</option>
            <option value="faq">FAQ</option>
            <option value="politica">Política</option>
            <option value="processo">Processo</option>
            <option value="geral">Geral</option>
          </select>
        </div>
        <div>
          <label className="label">Conteúdo</label>
          <textarea name="content" className="textarea" required />
        </div>
        <div>
          <label className="label">Tags (vírgula)</label>
          <input name="tags" className="input" placeholder="pagamento,pix" />
        </div>
        {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Adicionar
        </button>
      </form>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="surface p-6 text-sm text-[var(--ink-soft)]/60">
            Nenhum item ainda. Adicione FAQs, políticas e processos.
          </div>
        )}
        {items.map((item) => (
          <article key={item.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--teal)]">
                  {item.category}
                </p>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
              </div>
              <button
                onClick={() => remove(item.id)}
                className="btn btn-danger px-3 py-1 text-xs"
              >
                Excluir
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink-soft)]">
              {item.content}
            </p>
            {item.tags && (
              <p className="mt-3 text-xs text-[var(--ink-soft)]/50">{item.tags}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
