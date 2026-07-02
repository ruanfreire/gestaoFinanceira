import { SetMetadata } from '@nestjs/common';
import type { TenantRole } from '../constants/tenant-role';

export const TENANT_ROLES_KEY = 'tenantRoles';

export const TenantRoles = (...roles: TenantRole[]) => SetMetadata(TENANT_ROLES_KEY, roles);
