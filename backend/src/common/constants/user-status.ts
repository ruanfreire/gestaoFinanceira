export const USER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_ROLES = ['superadmin', 'client', 'admin', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LOGIN_STATUS_MESSAGES: Record<Exclude<UserStatus, 'approved'>, string> = {
  pending: 'Aguarde aprovação do administrador',
  rejected: 'Acesso negado. Entre em contato com o suporte.',
  suspended: 'Acesso temporariamente suspenso. Entre em contato com o suporte.',
};
