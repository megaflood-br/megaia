import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSentMessageId,
  isBotOutboundEcho,
  parseIncomingWebhook,
} from "./evolution";

function upsertPayload(opts: {
  fromMe: boolean;
  text: string;
  remoteJid?: string;
  id?: string;
}) {
  return {
    event: "messages.upsert",
    instance: "nexo",
    data: {
      key: {
        remoteJid: opts.remoteJid ?? "5511999999999@s.whatsapp.net",
        fromMe: opts.fromMe,
        id: opts.id ?? "MSG1",
      },
      pushName: "Maria",
      message: { conversation: opts.text },
    },
  };
}

describe("parseIncomingWebhook", () => {
  it("parses inbound customer text", () => {
    const parsed = parseIncomingWebhook(
      upsertPayload({ fromMe: false, text: "  oi  " })
    );
    assert.equal(parsed?.fromMe, false);
    assert.equal(parsed?.text, "oi");
    assert.equal(parsed?.from, "5511999999999@s.whatsapp.net");
  });

  it("parses fromMe human/bot outbound instead of dropping it", () => {
    const parsed = parseIncomingWebhook(
      upsertPayload({ fromMe: true, text: "Já estou te atendendo" })
    );
    assert.equal(parsed?.fromMe, true);
    assert.equal(parsed?.text, "Já estou te atendendo");
    assert.equal(parsed?.from, "5511999999999@s.whatsapp.net");
  });

  it("ignores group chats", () => {
    const parsed = parseIncomingWebhook(
      upsertPayload({
        fromMe: false,
        text: "oi",
        remoteJid: "120363@g.us",
      })
    );
    assert.equal(parsed, null);
  });
});

describe("isBotOutboundEcho", () => {
  const recent = [
    {
      content: "Como posso ajudar com nossos serviços ou preços?",
      externalMsgId: "BOT-1",
      createdAt: new Date(),
    },
  ];

  it("treats matching recent assistant text as echo", () => {
    assert.equal(
      isBotOutboundEcho({
        fromMe: true,
        text: "Como posso ajudar com nossos serviços ou preços?",
        recentAssistant: recent,
      }),
      true
    );
  });

  it("treats matching Evolution message id as echo", () => {
    assert.equal(
      isBotOutboundEcho({
        fromMe: true,
        text: "texto diferente",
        messageId: "BOT-1",
        recentAssistant: recent,
      }),
      true
    );
  });

  it("does not pause-skip a different human reply", () => {
    assert.equal(
      isBotOutboundEcho({
        fromMe: true,
        text: "Oi, sou a Ana da recepção. Já te atendo.",
        recentAssistant: recent,
      }),
      false
    );
  });

  it("does not treat inbound customer messages as echo", () => {
    assert.equal(
      isBotOutboundEcho({
        fromMe: false,
        text: "Como posso ajudar com nossos serviços ou preços?",
        recentAssistant: recent,
      }),
      false
    );
  });
});

describe("extractSentMessageId", () => {
  it("reads Evolution key.id at the root", () => {
    assert.equal(extractSentMessageId({ key: { id: "3EB0ABC" } }), "3EB0ABC");
  });

  it("reads nested message.key.id", () => {
    assert.equal(
      extractSentMessageId({ message: { key: { id: "AAA" } } }),
      "AAA"
    );
  });
});
