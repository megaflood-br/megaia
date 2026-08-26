"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { relativeTime } from "@/lib/utils";
import { useWhenVisibleInterval } from "@/lib/use-when-visible-interval";

type Row = {
  id: string;
  status: string;
  channel: string;
  contactName: string | null;
  contactPhone: string | null;
  lastMessageAt: string;
  agent: { name: string; avatarEmoji: string | null };
  messages: { role: string; content: string }[];
};

const TABS = [
  { id: "inbox", label: "Fila", status: "handoff" },
  { id: "open", label: "Com a IA", status: "open" },
  { id: "closed", label: "Encerradas", status: "closed" },
  { id: "all", label: "Todas", status: "" },
] as const;

export function InboxBoard({ initialTab }: { initialTab: string }) {
  const tab = TABS.some((t) => t.id === initialTab) ? initialTab : "inbox";
  const [active, setActive] = useState(tab);
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({
    open: 0,
    handoff: 0,
    closed: 0,
    total: 0,
  });

  const status = useMemo(
    () => TABS.find((t) => t.id === active)?.status ?? "",
    [active]
  );

  const load = useCallback(() => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    fetch(`/api/conversations${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.conversations) return;
        setRows(data.conversations);
        if (data.counts) setCounts(data.counts);
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useWhenVisibleInterval(load, 2500);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Inbox</h1>
        <p className="mt-2 text-[var(--ink-soft)]/70">
          Atenda o cliente por aqui. A lista atualiza sozinha quando chega
          mensagem nova.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n =
            t.id === "all"
              ? counts.total
              : t.status
                ? counts[t.status as "open" | "handoff" | "closed"] || 0
                : 0;
          const isOn = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              className={`btn ${isOn ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
              <span className="ml-1 opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="surface divide-y divide-[var(--line)]">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-[var(--ink-soft)]/60">
            {active === "inbox"
              ? "Nenhuma conversa na fila. Quando o cliente falar ou a IA transferir, aparece aqui."
              : "Nenhuma conversa neste filtro."}
          </p>
        )}
        {rows.map((c) => {
          const last = c.messages[0];
          const waiting = last?.role === "user";
          return (
            <Link
              key={c.id}
              href={`/app/conversations/${c.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--sand)]/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {c.agent.avatarEmoji}{" "}
                  {c.contactName || c.contactPhone || "Contato"}
                </p>
                <p className="truncate text-sm text-[var(--ink-soft)]/60">
                  via {c.channel} · {last?.content || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.status === "handoff"
                      ? "bg-amber-100 text-[var(--warn)]"
                      : c.status === "closed"
                        ? "bg-[var(--sand)] text-[var(--ink-soft)]"
                        : "bg-[var(--mint-soft)] text-[var(--teal-deep)]"
                  }`}
                >
                  {waiting && c.status !== "closed" ? "aguardando" : c.status}
                </span>
                <p className="mt-1 text-xs text-[var(--ink-soft)]/45">
                  {relativeTime(c.lastMessageAt)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
