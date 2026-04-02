import { Module } from '@nestjs/common';
import { ConfiguracaoRefeicaoController } from './configuracao-refeicao.controller';
import { ConfiguracaoRefeicaoService } from './configuracao-refeicao.service';

@Module({
  controllers: [ConfiguracaoRefeicaoController],
  providers: [ConfiguracaoRefeicaoService],
  exports: [ConfiguracaoRefeicaoService],
})
export class ConfiguracaoRefeicaoModule {}
