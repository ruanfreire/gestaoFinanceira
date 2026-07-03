import { IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class HonestConnectDto {
  @IsString()
  @MinLength(3)
  api_login!: string;

  @IsString()
  @MinLength(1, { message: 'api_password não pode estar vazio' })
  api_password!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^https?:\/\/.+/i, { message: 'api_base_url deve começar com http:// ou https://' })
  api_base_url!: string;
}

export class HonestCaptureDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  status?: number;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

export class HonestConfirmEndpointDto {
  @IsString()
  endpoint_id!: string;
}

export class HonestSelectEmpresaDto {
  @IsString()
  empresa_id!: string;
}
