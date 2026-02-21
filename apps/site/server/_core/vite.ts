import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

// IMPORTANTE: NÃO importar 'vite' no topo do arquivo com import estático.
// O esbuild (--packages=external) inclui vite.ts no bundle mas deixa o
// import 'vite' intacto. O Node.js ESM resolve todos os imports estáticos
// no startup — antes de qualquer código executar — causando
// ERR_MODULE_NOT_FOUND em produção onde vite é devDependency.
// Solução: import dinâmico DENTRO da função, só executado em desenvolvimento.

export async function setupVite(app: Express, server: Server) {
  // Import dinâmico: só é resolvido quando esta função é chamada (apenas em dev)
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    configFile: true,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] Build não encontrado: ${distPath}`);
  } else {
    console.log(`[Static] Servindo: ${distPath}`);
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Build não encontrado. Execute pnpm build.");
    }
  });
}
