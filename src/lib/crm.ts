export const CONTACT_STAGES = [
  { id: "lead", label: "Lead" },
  { id: "atendimento", label: "Em atendimento" },
  { id: "proposta", label: "Proposta" },
  { id: "cliente", label: "Cliente" },
  { id: "perdido", label: "Perdido" },
] as const;

export type ContactStage = (typeof CONTACT_STAGES)[number]["id"];

export type CustomField = { label: string; value: string };

export type ContactRecord = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  company: string | null;
  stage: string;
  tags: string;
  notes: string;
  source: string;
  fields: string;
  createdAt: Date;
  updatedAt: Date;
};

const STAGE_IDS = new Set<string>(CONTACT_STAGES.map((s) => s.id));

export function isContactStage(value: string): value is ContactStage {
  return STAGE_IDS.has(value);
}

export function stageLabel(stage: string) {
  return CONTACT_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

/** Digits only, strips WhatsApp JIDs. Empty → null. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const withoutJid = String(raw).split("@")[0] ?? "";
  const digits = withoutJid.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function displayPhone(raw: string | null | undefined) {
  const digits = normalizePhone(raw);
  if (!digits) return raw || "";
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

export function parseCustomFields(raw: unknown): CustomField[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { label?: unknown; value?: unknown };
      const label = String(row.label ?? "").trim();
      const fieldValue = String(row.value ?? "").trim();
      if (!label && !fieldValue) return null;
      return { label, value: fieldValue };
    })
    .filter((item): item is CustomField => item !== null);
}

export function serializeCustomFields(raw: unknown) {
  return JSON.stringify(parseCustomFields(raw));
}

export function parseTags(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function serializeTags(raw: string | string[] | null | undefined) {
  const list = Array.isArray(raw) ? raw : parseTags(raw);
  return list.join(", ");
}

export function contactToDto(contact: ContactRecord) {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    document: contact.document,
    company: contact.company,
    stage: isContactStage(contact.stage) ? contact.stage : "lead",
    tags: contact.tags,
    notes: contact.notes,
    source: contact.source,
    fields: parseCustomFields(contact.fields),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export function formatContactForPrompt(contact: ContactRecord | null | undefined) {
  if (!contact) return "";
  const lines = [
    contact.name && `Nome: ${contact.name}`,
    contact.phone && `Telefone: ${displayPhone(contact.phone)}`,
    contact.email && `E-mail: ${contact.email}`,
    contact.document && `Documento: ${contact.document}`,
    contact.company && `Empresa: ${contact.company}`,
    contact.stage && `Estágio: ${stageLabel(contact.stage)}`,
    parseTags(contact.tags).length && `Tags: ${parseTags(contact.tags).join(", ")}`,
  ].filter(Boolean) as string[];

  const extras = parseCustomFields(contact.fields).filter((f) => f.label && f.value);
  if (extras.length) {
    lines.push("Campos extras:");
    for (const field of extras) {
      lines.push(`- ${field.label}: ${field.value}`);
    }
  }
  if (contact.notes?.trim()) {
    lines.push(`Notas internas: ${contact.notes.trim()}`);
  }
  if (lines.length === 0) return "";

  return [
    "## Dados do contato (CRM)",
    "Use estes dados para personalizar o atendimento. Não invente informações que não estejam aqui.",
    ...lines,
  ].join("\n");
}
