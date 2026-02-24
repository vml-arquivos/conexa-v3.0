import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ─── Trust Proxy (Traefik / Coolify) ─────────────────────────────────────
  // Necessário para req.ip, req.protocol e cookies Secure funcionarem
  // corretamente quando a API está atrás de um reverse proxy.
  app.set('trust proxy', 1);

  // ─── Cookie Parser ────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ─── CORS estrito com whitelist explícita ─────────────────────────────────
  const allowedOrigins = [
    'https://app.conexa3.casadf.com.br',
    'https://conexa3.casadf.com.br',
    // 'https://staging.conexa3.casadf.com.br', // descomente quando existir
  ];

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
  console.log(`🚀 Conexa API rodando em http://0.0.0.0:${port}`);
  console.log(`🔒 CORS habilitado para: ${allowedOrigins.join(', ')}`);
}

bootstrap();
