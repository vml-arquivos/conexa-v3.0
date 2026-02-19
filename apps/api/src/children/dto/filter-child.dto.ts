import { IsOptional, IsString, IsEnum } from 'class-validator';
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
}
