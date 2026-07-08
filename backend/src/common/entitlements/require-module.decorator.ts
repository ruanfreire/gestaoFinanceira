import { SetMetadata } from '@nestjs/common';
import type { ModuleKey } from './module-catalog';

export const REQUIRE_MODULE_KEY = 'require_module';

export const RequireModule = (moduleKey: ModuleKey) => SetMetadata(REQUIRE_MODULE_KEY, moduleKey);
