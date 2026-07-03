import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CriarEmissaoRascunhoDto {
  @IsString()
  @MinLength(1)
  lancamento_id!: string;

  @IsOptional()
  @IsString()
  tomador_id?: string;
}

export class AtualizarEmissaoRascunhoDto {
  @IsOptional()
  @IsString()
  tomador_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsString()
  codigo_servico?: string;

  @IsOptional()
  @IsString()
  discriminacao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  aliquota_iss?: number;

  @IsOptional()
  @IsDateString()
  data_competencia?: string;
}
