import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--ink)] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(46,196,182,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(13,115,119,0.35), transparent 50%), linear-gradient(160deg, #0c1b2a 0%, #0a2f36 55%, #0c1b2a 100%)",
        }}
      />
      <div className="blob pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-[var(--mint)]/20 blur-3xl" />
      <div className="blob-delay pointer-events-none absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-[var(--teal)]/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-2xl font-bold tracking-tight">Nexo</div>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link href="/app" className="btn btn-accent">
              Abrir painel
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost border-white/20 text-white">
                Entrar
              </Link>
              <Link href="/register" className="btn btn-accent">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-5.5rem)] w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="animate-rise">
          <p className="mb-4 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
            Nexo
          </p>
          <h1 className="max-w-xl text-2xl font-medium leading-snug text-white/90 sm:text-3xl">
            Agentes de IA que conhecem sua empresa e atendem no WhatsApp.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65">
            Multitenant com OpenAI + Evolution API. Configure avatar, dados da
            empresa, tabela de preços e deixe o agente responder com contexto real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-rise-delay">
            <Link href="/register" className="btn btn-accent px-6 py-3 text-base">
              Começar agora
            </Link>
            <Link
              href="/login"
              className="btn border border-white/25 bg-white/5 text-white hover:bg-white/10"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section className="animate-rise-delay-2 relative hidden min-h-[420px] lg:block">
          <div
            className="absolute inset-0 rounded-[28px]"
            style={{
              backgroundImage:
                "linear-gradient(145deg, rgba(46,196,182,0.15), rgba(12,27,42,0.2)), url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 rounded-[28px] ring-1 ring-white/15" />
          <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-[var(--ink)]/75 p-5 backdrop-blur-md">
            <p className="text-sm text-white/60">Prévia do agente</p>
            <p className="mt-2 font-display text-xl">Luna · Clínica Vida Plena</p>
            <p className="mt-1 text-sm text-white/70">
              “A consulta clínica geral custa R$ 280. Quer que eu verifique
              horários disponíveis?”
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
