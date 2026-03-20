import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './services/gemini.service';
import { AiController } from './ai.controller';
import geminiConfig from '../config/gemini.config';

@Module({
  imports: [ConfigModule.forFeature(geminiConfig)],
  controllers: [AiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
