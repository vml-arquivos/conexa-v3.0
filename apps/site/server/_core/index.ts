import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
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

async function findAvailablePort(startPort: number = 3001): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:3001';
      const baseUrl = `${protocol}://${host}`;
      const sitemap = await generateSitemap(baseUrl);
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('[Sitemap] Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });
  
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'cocris-site', version: '3.0.0', timestamp: new Date().toISOString() });
  });

  // Robots.txt
  app.get('/robots.txt', (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3001';
    const baseUrl = `${protocol}://${host}`;
    res.type('text/plain');
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Configuração Obrigatória de Rede para Coolify
  const PORT = Number(process.env.PORT) || 3001; // Padrão 3001 para não conflitar com Backend
  const HOST = '0.0.0.0'; // Obrigatório para Docker/Coolify

  server.listen(PORT, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`📡 Network: Site Cocris is ready on port ${PORT}`);
  });
}

startServer().catch(console.error);
