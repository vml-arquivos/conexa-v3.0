import {
  IsString, IsOptional, IsBoolean, IsInt, Min, Max, Matches,
} from 'class-validator';

export class CreateConfiguracaoRefeicaoDto {
  @IsString()
  unitId: string;

  /** Nome da refeição (ex: "Colação", "Lanche da Manhã") */
  @IsString()
  nome: string;

  /** Horário sugerido no formato HH:MM (ex: "09:30") */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horario deve estar no formato HH:MM' })
  horario?: string;

  /** Ordem de exibição na interface */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
