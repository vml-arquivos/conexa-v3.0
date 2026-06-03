import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  rg?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  medicalConditions?: string;

  @IsString()
  @IsOptional()
  medicationNeeds?: string;

  // Campos já existentes no model Child e usados pela Secretaria
  @IsString()
  @IsOptional()
  raca?: string;

  @IsString()
  @IsOptional()
  peso?: string;

  @IsString()
  @IsOptional()
  celPai?: string;

  @IsBoolean()
  @IsOptional()
  usoImagem?: boolean;

  @IsBoolean()
  @IsOptional()
  laudado?: boolean;

  @IsString()
  @IsOptional()
  nis?: string;

  @IsString()
  @IsOptional()
  codigoAluno?: string;

  @IsString()
  @IsOptional()
  inscricao?: string;

  @IsString()
  @IsOptional()
  nomeMae?: string;

  @IsString()
  @IsOptional()
  nomePai?: string;

  @IsString()
  @IsOptional()
  tipoLaudo?: string;

  @IsString()
  @IsOptional()
  cid?: string;

  @IsString()
  @IsOptional()
  descricaoLaudo?: string;

  @IsString()
  @IsOptional()
  medicamentos?: string;

  // Campos administrativos aditivos para ficha de matrícula
  @IsString()
  @IsOptional()
  nacionalidade?: string;

  @IsString()
  @IsOptional()
  naturalidade?: string;

  @IsString()
  @IsOptional()
  ufNascimento?: string;

  @IsString()
  @IsOptional()
  endereco?: string;

  @IsString()
  @IsOptional()
  cep?: string;

  @IsObject()
  @IsOptional()
  dadosResponsaveis?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  documentosMatricula?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  autorizadosRetirada?: Array<Record<string, unknown>>;

  @IsObject()
  @IsOptional()
  transporteEscolar?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  fichaAdministrativa?: Record<string, unknown>;
}
