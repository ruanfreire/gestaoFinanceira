import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_ROLES_KEY } from '../decorators/tenant-roles.decorator';
import type { TenantRole } from '../constants/tenant-role';

@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<TenantRole[]>(TENANT_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest();
    const platformRoles: string[] = req.user?.roles ?? [];
    if (platformRoles.includes('superadmin')) return true;

    const tenantRole = (req.user?.tenantRole ??
      (platformRoles.includes('admin') ? 'owner' : 'operator')) as TenantRole;
    if (!required.includes(tenantRole)) {
      throw new ForbiddenException('Ação restrita ao proprietário da organização');
    }
    return true;
  }
}
