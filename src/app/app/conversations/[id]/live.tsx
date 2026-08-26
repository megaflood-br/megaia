"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConversationActions } from "./actions";
import { ConversationReply } from "./reply";
import { useWhenVisibleInterval } from "@/lib/use-when-visible-interval";
import { ContactCard, type ContactPayload } from "@/components/contact-card";

type Msg = {
  id: string;
  role: string;
  content: string;
};

type Conv = {
  id: string;
  status: string;
  channel: string;
  contactName: string | null;
  contactPhone: string | null;
  agent: { name: string; avatarEmoji: string | null };
  messages: Msg[];
  contact: ContactPayload | null;
};

function roleLabel(role: string) {
  if (role === "user") return "Cliente";
  if (role === "human") return "Atendente";
  if (role === "assistant") return "Agente";
  return role;
}

export function ConversationLive({ initial }: { initial: Conv }) {
  const [conv, setConv] = useState(initial);
  const scroller = useRef<HTMLDivElement>(null);
  const lastCount = useRef(initial.messages.length);

  useWhenVisibleInterval(() => {
    fetch(`/api/conversations/${initial.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.id || !Array.isArray(data.messages)) return;
        setConv((prev) => ({
          id: data.id,
          status: data.status,
          channel: data.channel,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          agent: data.agent,
          messages: data.messages,
          contact: data.contact ?? prev.contact,
        }));
      })
      .catch(() => {});
  }, 2000);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (conv.messages.length !== lastCount.current) {
      el.scrollTop = el.scrollHeight;
      lastCount.current = conv.messages.length;
    }
  }, [conv.messages.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/conversations"
            className="text-sm font-semibold text-[var(--teal)]"
          >
            ← Inbox
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {conv.contactName || conv.contactPhone || "Conversa"}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]/60">
            {conv.agent.avatarEmoji} {conv.agent.name} · {conv.channel} ·{" "}
            {conv.status}
          </p>
          {conv.status === "handoff" && (
            <p className="mt-2 max-w-xl text-sm text-amber-800">
              IA pausada. A conversa atualiza sozinha quando o cliente responde.
            </p>
          )}
        </div>
        <ConversationActions
          id={conv.id}
          status={conv.status}
          onStatusChange={(status) =>
            setConv((prev) => ({ ...prev, status }))
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <div
            ref={scroller}
            className="surface max-h-[55vh] space-y-3 overflow-y-auto p-5"
          >
            {conv.messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--ink)] text-white"
                    : m.role === "human"
                      ? "bg-amber-50"
                      : "bg-[var(--sand)]"
                }`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wide opacity-60">
                  {roleLabel(m.role)}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>

          <ConversationReply
            conversationId={conv.id}
            channel={conv.channel}
            closed={conv.status === "closed"}
            onSent={(message) => {
              setConv((prev) => ({
                ...prev,
                status: "handoff",
                messages: prev.messages.some((m) => m.id === message.id)
                  ? prev.messages
                  : [...prev.messages, message],
              }));
            }}
          />
        </div>

        {conv.contact && (
          <ContactCard
            compact
            contact={conv.contact}
            onSaved={(contact) =>
              setConv((prev) => ({
                ...prev,
                contact,
                contactName: contact.name,
                contactPhone: contact.phone,
              }))
            }
          />
        )}
      </div>
    </div>
  );
}
