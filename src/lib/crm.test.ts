import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayPhone,
  formatContactForPrompt,
  isContactStage,
  normalizePhone,
  parseCustomFields,
  parseTags,
  serializeCustomFields,
  serializeTags,
  stageLabel,
} from "./crm";

describe("normalizePhone", () => {
  it("strips WhatsApp JID and non-digits", () => {
    assert.equal(normalizePhone("5511987654321@s.whatsapp.net"), "5511987654321");
    assert.equal(normalizePhone("+55 (11) 98765-4321"), "5511987654321");
  });

  it("returns null for short or empty values", () => {
    assert.equal(normalizePhone(""), null);
    assert.equal(normalizePhone(null), null);
    assert.equal(normalizePhone("123"), null);
  });
});

describe("displayPhone", () => {
  it("formats Brazilian mobile with country code", () => {
    assert.equal(displayPhone("5511987654321"), "+55 (11) 98765-4321");
  });
});

describe("custom fields and tags", () => {
  it("parses JSON fields and drops empty rows", () => {
    const parsed = parseCustomFields(
      '[{"label":"Plano","value":"Premium"},{"label":"","value":""}]'
    );
    assert.deepEqual(parsed, [{ label: "Plano", value: "Premium" }]);
    assert.equal(
      serializeCustomFields([{ label: " Convênio ", value: " Amil " }]),
      JSON.stringify([{ label: "Convênio", value: "Amil" }])
    );
  });

  it("parses comma-separated tags", () => {
    assert.deepEqual(parseTags("vip, pix,  "), ["vip", "pix"]);
    assert.equal(serializeTags(["vip", "pix"]), "vip, pix");
  });
});

describe("CRM prompt context", () => {
  it("includes only filled fields and extras", () => {
    const prompt = formatContactForPrompt({
      id: "c1",
      name: "Maria Silva",
      phone: "5511987654321",
      email: "maria@demo.com",
      document: null,
      company: "Acme",
      stage: "proposta",
      tags: "vip",
      notes: "Prefere Pix",
      source: "whatsapp",
      fields: JSON.stringify([{ label: "CNPJ", value: "12.345" }]),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.match(prompt, /Dados do contato \(CRM\)/);
    assert.match(prompt, /Nome: Maria Silva/);
    assert.match(prompt, /Empresa: Acme/);
    assert.match(prompt, /Estágio: Proposta/);
    assert.match(prompt, /CNPJ: 12.345/);
    assert.match(prompt, /Prefere Pix/);
    assert.doesNotMatch(prompt, /Documento:/);
  });

  it("returns empty string without useful data", () => {
    assert.equal(
      formatContactForPrompt({
        id: "c2",
        name: "",
        phone: null,
        email: null,
        document: null,
        company: null,
        stage: "",
        tags: "",
        notes: "",
        source: "inbox",
        fields: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      ""
    );
  });
});

describe("stages", () => {
  it("validates known pipeline stages", () => {
    assert.equal(isContactStage("lead"), true);
    assert.equal(isContactStage("cliente"), true);
    assert.equal(isContactStage("outro"), false);
    assert.equal(stageLabel("atendimento"), "Em atendimento");
  });
});
