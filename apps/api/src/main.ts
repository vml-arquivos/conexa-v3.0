// TIMEZONE PEDAGÓGICO — garantia dupla de código
// Além desta linha, setar TZ=America/Sao_Paulo nas variáveis de ambiente do serviço de API no Coolify.
process.env.TZ = 'America/Sao_Paulo';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ─── Trust Proxy (Traefik / Coolify) ─────────────────────────────────────
  // Necessário para req.ip, req.protocol e cookies Secure funcionarem
  // corretamente quando a API está atrás de um reverse proxy.
  app.set('trust proxy', 1);

  // ─── Cookie Parser ────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ─── Limites de body para payloads JSON usuais ────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // ─── Arquivos estáticos de upload ──────────────────────────────────────────
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // ─── CORS estrito com whitelist explícita ─────────────────────────────────
  // Suporta CORS_ORIGIN via variável de ambiente (separado por vírgula) e
  // SEMPRE inclui os domínios canônicos COCRIS, mesmo quando CORS_ORIGIN
  // está configurado com valores diferentes.
  //
  // Motivo (incidente 2026-08-13): após a migração de domínio de
  // *.conexa3.casadf.com.br para *cocris.casadf.com.br, a variável
  // CORS_ORIGIN configurada no Coolify continuou apontando para os domínios
  // antigos. Como antes o valor do env substituía completamente a lista
  // padrão, o domínio novo (appcocris.casadf.com.br) passou a ser rejeitado
  // pelo CORS — o navegador bloqueava a resposta do /auth/login e o
  // frontend exibia "Network Error" na tela de login, mesmo com usuário e
  // senha corretos. Unificar as duas listas (env + padrão) evita que uma
  // variável de ambiente desatualizada derrube o login de novo no futuro.
  const corsEnv = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const defaultOrigins = [
    'https://appcocris.casadf.com.br',
    'https://cocris.casadf.com.br',
  ];

  const allowedOrigins: string[] = Array.from(new Set([...defaultOrigins, ...corsEnv]));

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl / Postman / mobile nativo
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origem não permitida pelo CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // ─── Validação Global ─────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 COCRIS Pedagógico API rodando em http://0.0.0.0:${port}`);
  console.log(`🔒 CORS habilitado para: ${allowedOrigins.join(', ')}`);
}

bootstrap();
