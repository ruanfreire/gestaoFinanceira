import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class TomadorEnderecoDto {
  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  uf?: string;

  @IsOptional()
  @IsString()
  cep?: string;
}

export class CreateTomadorDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TomadorEnderecoDto)
  endereco?: TomadorEnderecoDto;

  @IsOptional()
  @IsString()
  codigo_servico_padrao?: string;

  @IsOptional()
  @IsString()
  discriminacao_padrao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aliquota_iss_padrao?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases_pagamento?: string[];

  @IsOptional()
  @IsEnum(['manual', 'importacao_nf', 'sugestao'])
  origem?: 'manual' | 'importacao_nf' | 'sugestao';
}

export class UpdateTomadorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TomadorEnderecoDto)
  endereco?: TomadorEnderecoDto;

  @IsOptional()
  @IsString()
  codigo_servico_padrao?: string;

  @IsOptional()
  @IsString()
  discriminacao_padrao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aliquota_iss_padrao?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases_pagamento?: string[];

  @IsOptional()
  @IsEnum(['manual', 'importacao_nf', 'sugestao'])
  origem?: 'manual' | 'importacao_nf' | 'sugestao';
}

export class ResolverTomadorDto {
  @IsString()
  @MinLength(2)
  pagador_nome!: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  data?: string;
}
