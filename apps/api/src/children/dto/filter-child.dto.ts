import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class FilterChildDto {
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;
}
