import { defineConfig } from "drizzle-kit";

// SITE_DATABASE_URL aponta para o Postgres 17 no Coolify.
// Nunca usar DATABASE_URL (MySQL da API) aqui.
const connectionString = process.env.SITE_DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "SITE_DATABASE_URL é obrigatório para executar comandos Drizzle no site. " +
    "Configure a variável de ambiente no Coolify apontando para o Postgres 17."
  );
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
