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
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function switchTab(next: "services" | "products") {
    setTab(next);
    setError("");
    setEditingService(null);
    setEditingProduct(null);
  }

  async function submitService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const durationMinRaw = form.get("durationMin");
    const durationMin = durationMinRaw
      ? Number(durationMinRaw)
      : editingService
        ? null
        : undefined;
    const payload = {
      kind: "service",
      name: form.get("name"),
      description: form.get("description") || undefined,
      category: form.get("category") || undefined,
      price: Number(form.get("price")),
      priceType: form.get("priceType"),
      durationMin,
    };
    const res = await fetch(
      editingService ? `/api/catalog/service/${editingService.id}` : "/api/catalog",
      {
        method: editingService ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingService
            ? {
                name: payload.name,
                description: payload.description ?? null,
                category: payload.category ?? null,
                price: payload.price,
                priceType: payload.priceType,
                durationMin: payload.durationMin ?? null,
              }
            : payload
        ),
      }
    );
    setSaving(false);
    if (!res.ok) {
      setError("Erro ao salvar serviço");
      return;
    }
    const item = (await res.json()) as Service;
    if (editingService) {
      setServices((prev) =>
        prev
          .map((s) => (s.id === item.id ? item : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingService(null);
    } else {
      setServices((prev) =>
        [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
      );
      e.currentTarget.reset();
    }
    router.refresh();
  }

  async function submitProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      kind: "product",
      name: form.get("name"),
      sku: form.get("sku") || undefined,
      description: form.get("description") || undefined,
      category: form.get("category") || undefined,
      price: Number(form.get("price")),
      inStock: form.get("inStock") === "on",
    };
    const res = await fetch(
      editingProduct ? `/api/catalog/product/${editingProduct.id}` : "/api/catalog",
      {
        method: editingProduct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingProduct
            ? {
                name: payload.name,
                sku: payload.sku ?? null,
                description: payload.description ?? null,
                category: payload.category ?? null,
                price: payload.price,
                inStock: payload.inStock,
              }
            : { ...payload, inStock: true }
        ),
      }
    );
    setSaving(false);
    if (!res.ok) {
      setError("Erro ao salvar produto");
      return;
    }
    const item = (await res.json()) as Product;
    if (editingProduct) {
      setProducts((prev) =>
        prev
          .map((p) => (p.id === item.id ? item : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingProduct(null);
    } else {
      setProducts((prev) =>
        [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
      );
      e.currentTarget.reset();
    }
    router.refresh();
  }

  async function remove(kind: "service" | "product", id: string) {
    const res = await fetch(`/api/catalog/${kind}/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (kind === "service") {
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (editingService?.id === id) setEditingService(null);
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingProduct?.id === id) setEditingProduct(null);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          className={`btn ${tab === "services" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => switchTab("services")}
        >
          Serviços
        </button>
        <button
          className={`btn ${tab === "products" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => switchTab("products")}
        >
          Produtos
        </button>
      </div>

      {error && <p className="text-sm text-[var(--coral)]">{error}</p>}

      {tab === "services" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form
            key={editingService?.id ?? "new-service"}
            onSubmit={submitService}
            className="surface h-fit space-y-3 p-6"
          >
            <h2 className="font-display text-lg font-semibold">
              {editingService ? "Editar serviço" : "Novo serviço"}
            </h2>
            <input
              name="name"
              className="input"
              placeholder="Nome"
              required
              defaultValue={editingService?.name ?? ""}
            />
            <input
              name="category"
              className="input"
              placeholder="Categoria"
              defaultValue={editingService?.category ?? ""}
            />
            <textarea
              name="description"
              className="textarea"
              placeholder="Descrição"
              defaultValue={editingService?.description ?? ""}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="price"
                type="number"
                step="0.01"
                className="input"
                placeholder="Preço"
                required
                defaultValue={editingService?.price ?? ""}
              />
              <select
                name="priceType"
                className="input"
                defaultValue={editingService?.priceType ?? "fixed"}
              >
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
              defaultValue={editingService?.durationMin ?? ""}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? "Salvando…"
                  : editingService
                    ? "Salvar alterações"
                    : "Adicionar serviço"}
              </button>
              {editingService && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingService(null)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="space-y-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="surface flex items-start justify-between gap-3 p-5"
              >
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
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(s);
                      setError("");
                    }}
                    className="btn btn-ghost px-3 py-1 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove("service", s.id)}
                    className="btn btn-danger px-3 py-1 text-xs"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form
            key={editingProduct?.id ?? "new-product"}
            onSubmit={submitProduct}
            className="surface h-fit space-y-3 p-6"
          >
            <h2 className="font-display text-lg font-semibold">
              {editingProduct ? "Editar produto" : "Novo produto"}
            </h2>
            <input
              name="name"
              className="input"
              placeholder="Nome"
              required
              defaultValue={editingProduct?.name ?? ""}
            />
            <input
              name="sku"
              className="input"
              placeholder="SKU"
              defaultValue={editingProduct?.sku ?? ""}
            />
            <input
              name="category"
              className="input"
              placeholder="Categoria"
              defaultValue={editingProduct?.category ?? ""}
            />
            <textarea
              name="description"
              className="textarea"
              placeholder="Descrição"
              defaultValue={editingProduct?.description ?? ""}
            />
            <input
              name="price"
              type="number"
              step="0.01"
              className="input"
              placeholder="Preço"
              required
              defaultValue={editingProduct?.price ?? ""}
            />
            {editingProduct && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="inStock"
                  defaultChecked={editingProduct.inStock}
                />
                Em estoque
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? "Salvando…"
                  : editingProduct
                    ? "Salvar alterações"
                    : "Adicionar produto"}
              </button>
              {editingProduct && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="surface flex items-start justify-between gap-3 p-5"
              >
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
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(p);
                      setError("");
                    }}
                    className="btn btn-ghost px-3 py-1 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove("product", p.id)}
                    className="btn btn-danger px-3 py-1 text-xs"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
