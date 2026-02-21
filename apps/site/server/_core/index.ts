import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { generateSitemap } from "../sitemap";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

function serveStatic(app: express.Express) {
  // Em produção o Vite gera os assets em dist/public (relativo à raiz do projeto)
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] Diretório de build não encontrado: ${distPath}`);
  } else {
    console.log(`[Static] Servindo arquivos de: ${distPath}`);
  }

  app.use(express.static(distPath));

  // Fallback SPA — todas as rotas retornam index.html
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Aplicação não compilada. Execute pnpm build.");
    }
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  // Sitemap
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const protocol = req.protocol;
      const host = req.get("host") || "localhost:3000";
      const baseUrl = `${protocol}://${host}`;
      const sitemap = await generateSitemap(baseUrl);
      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error) {
      console.error("[Sitemap] Erro:", error);
      res.status(500).send("Erro ao gerar sitemap");
    }
  });

  // Health check para o Coolify
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "cocris-site",
      version: "3.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const protocol = req.protocol;
    const host = req.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml`);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // IMPORTANTE: usar new Function para o import dinâmico de vite.ts
  // O esbuild analisa import() estático e inclui vite.ts no bundle,
  // o que faz o Node tentar resolver 'vite' (devDependency) em produção.
  // new Function('return import(...)') é opaco para o esbuild — ele não
  // analisa o conteúdo e não inclui vite.ts no bundle.
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-new-func
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const viteModule = await dynamicImport('./vite.js');
    await viteModule.setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = "0.0.0.0";

  server.listen(PORT, HOST, () => {
    console.log(`✅ Conexa Site rodando em http://${HOST}:${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || "production"}`);
  });
}

startServer().catch(console.error);
