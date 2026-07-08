import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { MODULE_KEYS } from '../../../common/entitlements/module-catalog';

export class UpdateOrgModulesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsIn(MODULE_KEYS, { each: true })
  enabled_modules!: string[];
}

export class ToggleOrgModuleDto {
  @IsBoolean()
  enabled!: boolean;
}
