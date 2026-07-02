export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export type TenantRole = "owner" | "operator";

export type OrganizationSummary = {
  _id: string;
  name: string;
  slug?: string;
  status?: UserStatus;
  cnpj?: string;
  trialEndsAt?: string;
  plan?: "trial" | "starter" | "pro";
  billingStatus?: string;
  currentPeriodEnd?: string;
  hasSubscription?: boolean;
};

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  roles?: string[];
  status?: UserStatus;
  tenantId?: string;
  tenantRole?: TenantRole;
  organization?: OrganizationSummary;
  company?: string;
  cnpj?: string;
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
  remember?: boolean;
};

export type SignupCredentials = {
  name: string;
  email: string;
  password: string;
  company: string;
  cnpj?: string;
  phone?: string;
};

export type LoginResponse = {
  ok: boolean;
  accessToken?: string;
  user?: AuthUser;
  message?: string;
};

export type SignupResponse = {
  ok: boolean;
  message?: string;
  user?: AuthUser;
};

export type AcceptInviteResponse = {
  ok: boolean;
  message?: string;
  user?: AuthUser;
  accessToken?: string;
};

export function isSuperadmin(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.roles?.includes("superadmin"));
}

export function isClientAppUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (isSuperadmin(user)) return false;
  return true;
}

export function isTenantOwner(user: AuthUser | null | undefined): boolean {
  return user?.tenantRole === "owner";
}
