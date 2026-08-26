import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "./db";
import { attachConversationContact, ensureContact } from "./crm-store";

describe("CRM store", () => {
  let tenantId = "";
  let agentId = "";

  it("upserts WhatsApp contacts by phone and allows several without phone", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "CRM Test",
        slug: `crm-test-${Date.now()}`,
        agents: {
          create: {
            name: "Bot",
            slug: "bot",
            isActive: true,
          },
        },
      },
      include: { agents: true },
    });
    tenantId = tenant.id;
    agentId = tenant.agents[0]!.id;

    const first = await ensureContact(tenantId, {
      name: "Maria",
      phone: "+55 (11) 98765-4321",
      source: "whatsapp",
    });
    const second = await ensureContact(tenantId, {
      name: "Maria WhatsApp",
      phone: "5511987654321@s.whatsapp.net",
      source: "whatsapp",
    });
    assert.equal(second.id, first.id);
    assert.equal(first.phone, "5511987654321");

    const webA = await ensureContact(tenantId, {
      name: "Visitante A",
      source: "web",
    });
    const webB = await ensureContact(tenantId, {
      name: "Visitante B",
      source: "web",
    });
    assert.notEqual(webA.id, webB.id);

    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        agentId,
        channel: "whatsapp",
        contactName: "Maria",
        contactPhone: "5511987654321",
        externalId: "5511987654321@s.whatsapp.net",
        status: "open",
      },
    });
    const linked = await attachConversationContact(conversation);
    assert.equal(linked.id, first.id);
    const reloaded = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });
    assert.equal(reloaded?.contactId, first.id);
  });

  after(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
  });
});
