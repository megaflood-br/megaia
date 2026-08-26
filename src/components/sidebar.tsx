"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  LayoutDashboard,
  BookOpen,
  Tags,
  MessageSquare,
  ContactRound,
  Plug,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Visão geral", icon: LayoutDashboard },
  { href: "/app/agents", label: "Agentes", icon: Bot },
  { href: "/app/company", label: "Empresa", icon: Building2 },
  { href: "/app/knowledge", label: "Conhecimento", icon: BookOpen },
  { href: "/app/catalog", label: "Catálogo", icon: Tags },
  { href: "/app/conversations", label: "Inbox", icon: MessageSquare },
  { href: "/app/crm", label: "CRM", icon: ContactRound },
  { href: "/app/integrations", label: "Integrações", icon: Plug },
];

export function Sidebar({
  tenantName,
  userName,
}: {
  tenantName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <>
      <div className="mb-8 px-2">
        <div className="font-display text-2xl font-bold text-white">Nexo</div>
        <p className="mt-1 truncate text-xs text-white/50">{tenantName}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn("nav-link", active && "active")}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="mb-3 truncate px-2 text-xs text-white/45">{userName}</p>
        <button onClick={logout} className="nav-link w-full text-left">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-[var(--ink)] p-4 md:flex">
        {nav}
      </aside>

      <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3 md:hidden">
        <div className="font-display text-lg font-bold">Nexo</div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-[var(--sand)]"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[var(--ink)] p-4">
            <button
              onClick={() => setOpen(false)}
              className="mb-4 self-end rounded-lg p-2 text-white/70 hover:bg-white/10"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
