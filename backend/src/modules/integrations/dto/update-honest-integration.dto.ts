import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateHonestIntegrationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emissao_nf_habilitada?: boolean;

  @IsOptional()
  @IsBoolean()
  auto_sync_enabled?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(3)
  api_login?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  api_password?: string;

  @IsOptional()
  @IsString()
  api_base_url?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sync_urls?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  sync_interval_minutes?: number;
}
