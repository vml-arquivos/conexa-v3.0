import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ReturnPlanningDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'O comentário de devolução deve ter pelo menos 5 caracteres.' })
  comment: string;
}
