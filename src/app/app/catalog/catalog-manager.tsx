"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  price: number;
  currency: string;
  inStock: boolean;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  priceType: string;
  currency: string;
  durationMin: number | null;
};

export function CatalogManager({
  initialProducts,
  initialServices,
}: {
  initialProducts: Product[];
  initialServices: Service[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [services, setServices] = useState(initialServices);
  const [tab, setTab] = useState<"services" | "products">("services");

  async function createService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "service",
        name: form.get("name"),
        description: form.get("description"),
        category: form.get("category"),
        price: Number(form.get("price")),
        priceType: form.get("priceType"),
        durationMin: form.get("durationMin")
          ? Number(form.get("durationMin"))
          : undefined,
      }),
    });
    if (!res.ok) return;
    const item = await res.json();
    setServices((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    e.currentTarget.reset();
    router.refresh();
  }

  async function createProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "product",
        name: form.get("name"),
        sku: form.get("sku"),
        description: form.get("description"),
        category: form.get("category"),
        price: Number(form.get("price")),
        inStock: true,
      }),
    });
    if (!res.ok) return;
    const item = await res.json();
    setProducts((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    e.currentTarget.reset();
    router.refresh();
  }

  async function remove(kind: "service" | "product", id: string) {
    const res = await fetch(`/api/catalog/${kind}/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (kind === "service") setServices((prev) => prev.filter((s) => s.id !== id));
    else setProducts((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          className={`btn ${tab === "services" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("services")}
        >
          Serviços
        </button>
        <button
          className={`btn ${tab === "products" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("products")}
        >
          Produtos
        </button>
      </div>

      {tab === "services" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={createService} className="surface h-fit space-y-3 p-6">
            <h2 className="font-display text-lg font-semibold">Novo serviço</h2>
            <input name="name" className="input" placeholder="Nome" required />
            <input name="category" className="input" placeholder="Categoria" />
            <textarea name="description" className="textarea" placeholder="Descrição" />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="price"
                type="number"
                step="0.01"
                className="input"
                placeholder="Preço"
                required
              />
              <select name="priceType" className="input" defaultValue="fixed">
                <option value="fixed">Fixo</option>
                <option value="from">A partir de</option>
                <option value="hourly">Por hora</option>
                <option value="quote">Sob consulta</option>
              </select>
            </div>
            <input
              name="durationMin"
              type="number"
              className="input"
              placeholder="Duração (min)"
            />
            <button type="submit" className="btn btn-primary">
              Adicionar serviço
            </button>
          </form>
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="surface flex items-start justify-between gap-3 p-5">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-[var(--ink-soft)]/70">
                    {s.priceType === "from" ? "a partir de " : ""}
                    {s.priceType === "quote"
                      ? "sob consulta"
                      : formatBRL(s.price, s.currency)}
                    {s.durationMin ? ` · ${s.durationMin} min` : ""}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-sm text-[var(--ink-soft)]/60">
                      {s.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove("service", s.id)}
                  className="btn btn-danger px-3 py-1 text-xs"
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={createProduct} className="surface h-fit space-y-3 p-6">
            <h2 className="font-display text-lg font-semibold">Novo produto</h2>
            <input name="name" className="input" placeholder="Nome" required />
            <input name="sku" className="input" placeholder="SKU" />
            <input name="category" className="input" placeholder="Categoria" />
            <textarea name="description" className="textarea" placeholder="Descrição" />
            <input
              name="price"
              type="number"
              step="0.01"
              className="input"
              placeholder="Preço"
              required
            />
            <button type="submit" className="btn btn-primary">
              Adicionar produto
            </button>
          </form>
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="surface flex items-start justify-between gap-3 p-5">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-[var(--ink-soft)]/70">
                    {formatBRL(p.price, p.currency)}
                    {p.inStock ? " · em estoque" : " · indisponível"}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </p>
                  {p.description && (
                    <p className="mt-1 text-sm text-[var(--ink-soft)]/60">
                      {p.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove("product", p.id)}
                  className="btn btn-danger px-3 py-1 text-xs"
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
