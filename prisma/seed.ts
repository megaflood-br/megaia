import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Clínica Vida Plena",
      slug: "demo",
      plan: "pro",
      companyProfile: {
        create: {
          tradeName: "Clínica Vida Plena",
          legalName: "Vida Plena Saúde LTDA",
          document: "12.345.678/0001-90",
          phone: "(11) 4000-1234",
          email: "contato@vidaplena.demo",
          website: "https://vidaplena.demo",
          address: "Av. Paulista, 1000",
          city: "São Paulo",
          state: "SP",
          zipCode: "01310-100",
          description:
            "Clínica multidisciplinar com foco em atendimento humanizado, check-ups e especialidades.",
          mission: "Cuidar da saúde com clareza, empatia e excelência técnica.",
          differentials:
            "Atendimento no mesmo dia, equipe multidisciplinar, estacionamento gratuito.",
          businessHours: JSON.stringify({
            mon: { open: "08:00", close: "18:00" },
            tue: { open: "08:00", close: "18:00" },
            wed: { open: "08:00", close: "18:00" },
            thu: { open: "08:00", close: "18:00" },
            fri: { open: "08:00", close: "17:00" },
            sat: { open: "08:00", close: "12:00" },
            sun: null,
          }),
        },
      },
      users: {
        create: {
          email: "demo@nexo.app",
          name: "Ana Demo",
          passwordHash,
          role: "owner",
        },
      },
      agents: {
        create: {
          name: "Luna",
          slug: "luna",
          avatarEmoji: "🌿",
          roleTitle: "Assistente de atendimento",
          personality:
            "Acolhedora, objetiva e profissional. Usa português brasileiro claro, sem jargões desnecessários.",
          systemPrompt:
            "Você é Luna, assistente virtual da Clínica Vida Plena. Ajude pacientes a tirar dúvidas sobre serviços, preços e agendamentos. Quando não souber algo, diga com honestidade e ofereça transferir para um humano.",
          welcomeMessage:
            "Olá! Sou a Luna, da Clínica Vida Plena. Como posso ajudar hoje?",
          model: "gpt-4o-mini",
          isActive: true,
        },
      },
      knowledgeItems: {
        create: [
          {
            title: "Formas de pagamento",
            category: "politica",
            content:
              "Aceitamos Pix, cartão de crédito (até 3x sem juros), débito e dinheiro. Convênios: Amil, Bradesco Saúde e SulAmérica (consultar cobertura).",
            tags: "pagamento,convenio,pix",
          },
          {
            title: "Como remarcar consulta",
            category: "faq",
            content:
              "Remarcações com até 24h de antecedência sem custo. Faltas sem aviso podem gerar taxa de R$ 50.",
            tags: "remarcacao,falta,agenda",
          },
          {
            title: "Endereço e estacionamento",
            category: "empresa",
            content:
              "Av. Paulista, 1000 — São Paulo/SP. Estacionamento gratuito para pacientes no subsolo.",
            tags: "endereco,estacionamento",
          },
        ],
      },
      products: {
        create: [
          {
            name: "Kit check-up anual",
            sku: "KIT-CHECKUP",
            description: "Exames laboratoriais + avaliação clínica completa.",
            category: "Pacotes",
            price: 489.9,
            inStock: true,
          },
          {
            name: "Máscara facial hidratante",
            sku: "PROD-MASK",
            description: "Produto cosmético pós-procedimento.",
            category: "Cosméticos",
            price: 79.9,
            inStock: true,
          },
        ],
      },
      services: {
        create: [
          {
            name: "Consulta clínica geral",
            description: "Avaliação médica inicial com anamnese completa.",
            category: "Consultas",
            price: 280,
            priceType: "fixed",
            durationMin: 40,
          },
          {
            name: "Avaliação dermatológica",
            description: "Consulta com dermatologista.",
            category: "Especialidades",
            price: 350,
            priceType: "fixed",
            durationMin: 30,
          },
          {
            name: "Limpeza de pele",
            description: "Procedimento estético com extração e hidratação.",
            category: "Estética",
            price: 220,
            priceType: "from",
            durationMin: 60,
          },
        ],
      },
      contacts: {
        create: [
          {
            name: "Maria Silva",
            phone: "5511987654321",
            email: "maria@demo.com",
            company: "Família Silva",
            stage: "atendimento",
            tags: "vip, retorno",
            notes: "Prefere Pix. Remarcar só pela manhã.",
            source: "whatsapp",
            fields: JSON.stringify([
              { label: "Convênio", value: "Amil" },
              { label: "Unidade", value: "Paulista" },
            ]),
          },
        ],
      },
    },
  });

  console.log("Seed OK — tenant:", tenant.slug);
  console.log("Login: demo@nexo.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
