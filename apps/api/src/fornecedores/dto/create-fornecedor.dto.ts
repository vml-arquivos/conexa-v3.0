import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateFornecedorDto {
  @IsString()
  @IsNotEmpty()
  razaoSocial: string;

  @IsString()
  @IsOptional()
  nomeFantasia?: string;

  @IsString()
  @IsNotEmpty()
  cnpj: string;

  @IsString()
  @IsOptional()
  inscricaoEstadual?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  celular?: string;

  @IsString()
  @IsOptional()
  endereco?: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  cep?: string;

  @IsString()
  @IsOptional()
  contato?: string;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
