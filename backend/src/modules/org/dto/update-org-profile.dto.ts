import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateOrgProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
