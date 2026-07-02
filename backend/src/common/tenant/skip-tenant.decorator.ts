import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_KEY = 'skipTenant';

/** Rotas sem escopo de tenant (auth, superadmin, health). */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);
