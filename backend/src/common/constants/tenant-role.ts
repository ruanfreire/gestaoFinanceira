export const TENANT_ROLES = ['owner', 'operator'] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];
