import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

// Serviços e controllers existentes
import { IaAssistivaService } from './ia-assistiva.service';
import { IaAssistivaController } from './ia-assistiva.controller';

// Fase 1 — Fundação Técnica de IA
import { PromptService } from './prompt/prompt.service';
import { PromptController } from './prompt/prompt.controller';
import { IaExecutorService } from './executor/ia-executor.service';
import { IaOrchestratorService } from './orchestrator/ia-orchestrator.service';
import { IaOrchestratorController } from './orchestrator/ia-orchestrator.controller';

@Module({
  imports: [
    AiModule,
    PrismaModule,
  ],
  controllers: [
    IaAssistivaController,
    IaOrchestratorController,
    PromptController,
  ],
  providers: [
    IaAssistivaService,
    PromptService,
    IaExecutorService,
    IaOrchestratorService,
  ],
  exports: [
    IaAssistivaService,
    IaOrchestratorService,
    PromptService,
    IaExecutorService,
  ],
})
export class IaAssistivaModule {}
