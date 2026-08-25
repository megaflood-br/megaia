"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        companyName: form.get("companyName"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Falha no cadastro");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#d8f5f1_0%,_transparent_50%)]" />
      <div className="relative w-full max-w-md surface p-8">
        <Link href="/" className="font-display text-2xl font-bold text-[var(--ink)]">
          Nexo
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold">Criar workspace</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]/70">
          Cada empresa é um tenant isolado, com seus agentes e dados.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="companyName">
              Nome da empresa
            </label>
            <input id="companyName" name="companyName" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="name">
              Seu nome
            </label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={6}
              required
              className="input"
            />
          </div>
          {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--ink-soft)]/70">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-[var(--teal)]">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
