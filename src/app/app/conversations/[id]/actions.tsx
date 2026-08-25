"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConversationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: string) {
    setLoading(true);
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "open" && (
        <button
          className="btn btn-ghost"
          disabled={loading}
          onClick={() => setStatus("open")}
        >
          Reabrir / IA
        </button>
      )}
      {status !== "handoff" && (
        <button
          className="btn btn-ghost"
          disabled={loading}
          onClick={() => setStatus("handoff")}
        >
          Transferir
        </button>
      )}
      {status !== "closed" && (
        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={() => setStatus("closed")}
        >
          Encerrar
        </button>
      )}
    </div>
  );
}
