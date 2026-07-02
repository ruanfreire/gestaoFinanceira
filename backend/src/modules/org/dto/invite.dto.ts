import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { TenantRole } from '../../../common/constants/tenant-role';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(['owner', 'operator'])
  tenantRole?: TenantRole;
}

export class AcceptInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
