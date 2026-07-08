import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ModuleKey } from './module-catalog';
import { EntitlementsService } from './entitlements.service';
import { REQUIRE_MODULE_KEY } from './require-module.decorator';

@Injectable()
export class RequireModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<ModuleKey>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleKey) return true;

    const req = context.switchToHttp().getRequest();
    const roles: string[] = req.user?.roles ?? [];
    if (roles.includes('superadmin')) return true;

    const tenantId = req.user?.tenantId ? String(req.user.tenantId) : null;
    if (!tenantId) {
      throw new ForbiddenException({
        code: 'MODULE_DISABLED',
        module: moduleKey,
        message: 'Módulo não disponível para esta organização',
      });
    }

    const allowed = await this.entitlements.hasModule(tenantId, moduleKey);
    if (!allowed) {
      throw new ForbiddenException({
        code: 'MODULE_DISABLED',
        module: moduleKey,
        message: 'Módulo não disponível para esta organização',
      });
    }

    return true;
  }
}
