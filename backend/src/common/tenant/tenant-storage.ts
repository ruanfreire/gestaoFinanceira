import { AsyncLocalStorage } from 'async_hooks';
import { Types } from 'mongoose';

export type TenantStore = {
  tenantId: Types.ObjectId;
};

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getCurrentTenantId(): Types.ObjectId | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

export function runWithTenant<T>(tenantId: Types.ObjectId, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn);
}
