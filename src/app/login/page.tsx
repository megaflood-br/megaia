"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Falha no login");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d8f5f1_0%,_transparent_55%)]" />
      <div className="relative w-full max-w-md surface p-8">
        <Link href="/" className="font-display text-2xl font-bold text-[var(--ink)]">
          Nexo
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold">Entrar</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]/70">
          Acesse o painel da sua empresa.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              placeholder="voce@empresa.com"
              defaultValue="demo@nexo.app"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input"
              defaultValue="demo1234"
            />
          </div>
          {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--ink-soft)]/70">
          Não tem conta?{" "}
          <Link href="/register" className="font-semibold text-[var(--teal)]">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}
