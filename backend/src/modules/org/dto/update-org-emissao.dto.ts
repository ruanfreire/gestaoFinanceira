import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PREFEITURA_CODIGOS } from '../../emissao/types/prefeitura-emissao.types';

export class UpdateOrgEmissaoDto {
  @IsOptional()
  @IsBoolean()
  emissao_nf_habilitada?: boolean;

  @IsOptional()
  @IsIn([...PREFEITURA_CODIGOS])
  prefeitura_codigo?: (typeof PREFEITURA_CODIGOS)[number];
}
