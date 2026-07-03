/** Categorias para preferências do usuário. */
export type NotificationCategory = 'platform' | 'imports' | 'conciliation' | 'billing' | 'team';

export const NOTIFICATION_TYPES = [
  // Plataforma / conta
  'signup',
  'approved',
  'rejected',
  'suspended',
  'system',
  // Importações
  'import_json_done',
  'import_json_failed',
  'import_csv_done',
  'import_csv_failed',
  // Conciliação
  'conciliation_pending',
  'conciliation_sem_match',
  'conciliation_auto_linked',
  // Equipe
  'invite_sent',
  'invite_accepted',
  // Billing
  'billing_trial_ending',
  'billing_payment_failed',
  'billing_subscription_canceled',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CATEGORY: Record<NotificationType, NotificationCategory> = {
  signup: 'platform',
  approved: 'platform',
  rejected: 'platform',
  suspended: 'platform',
  system: 'platform',
  import_json_done: 'imports',
  import_json_failed: 'imports',
  import_csv_done: 'imports',
  import_csv_failed: 'imports',
  conciliation_pending: 'conciliation',
  conciliation_sem_match: 'conciliation',
  conciliation_auto_linked: 'conciliation',
  invite_sent: 'team',
  invite_accepted: 'team',
  billing_trial_ending: 'billing',
  billing_payment_failed: 'billing',
  billing_subscription_canceled: 'billing',
};

export const DEFAULT_PUSH_CATEGORIES: Record<NotificationCategory, boolean> = {
  platform: true,
  imports: true,
  conciliation: true,
  billing: true,
  team: true,
};
