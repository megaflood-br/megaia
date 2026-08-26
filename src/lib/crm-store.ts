import { prisma } from "@/lib/db";
import { displayPhone, normalizePhone } from "@/lib/crm";

export async function ensureContact(
  tenantId: string,
  input: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    source?: string;
  }
) {
  const phone = normalizePhone(input.phone);
  const name = (input.name || "").trim();
  const email = (input.email || "").trim() || null;
  const source = input.source || "inbox";

  if (phone) {
    const existing = await prisma.contact.findFirst({
      where: { tenantId, phone },
    });
    if (existing) {
      const nextName =
        name && (!existing.name.trim() || existing.name === "Contato")
          ? name
          : existing.name;
      const nextEmail = existing.email || email;
      if (nextName !== existing.name || nextEmail !== existing.email) {
        return prisma.contact.update({
          where: { id: existing.id },
          data: { name: nextName, email: nextEmail },
        });
      }
      return existing;
    }
  }

  return prisma.contact.create({
    data: {
      tenantId,
      name: name || (phone ? displayPhone(phone) : "Contato"),
      phone,
      email,
      source,
    },
  });
}

export async function attachConversationContact(conversation: {
  id: string;
  tenantId: string;
  contactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  externalId?: string | null;
  channel?: string | null;
}) {
  if (conversation.contactId) {
    const linked = await prisma.contact.findFirst({
      where: { id: conversation.contactId, tenantId: conversation.tenantId },
    });
    if (linked) return linked;
  }

  const contact = await ensureContact(conversation.tenantId, {
    name: conversation.contactName,
    phone: conversation.contactPhone || conversation.externalId,
    source: conversation.channel || "inbox",
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      contactId: contact.id,
      contactName: contact.name || conversation.contactName,
      contactPhone: contact.phone || conversation.contactPhone,
    },
  });

  return contact;
}

export async function backfillConversationContacts(tenantId: string) {
  const orphans = await prisma.conversation.findMany({
    where: { tenantId, contactId: null },
    select: {
      id: true,
      tenantId: true,
      contactId: true,
      contactName: true,
      contactPhone: true,
      externalId: true,
      channel: true,
    },
    take: 100,
  });
  for (const row of orphans) {
    await attachConversationContact(row);
  }
  return orphans.length;
}
