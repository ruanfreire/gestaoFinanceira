import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { connect, connection, model, Model, Types } from 'mongoose';
import { asLeanMany, asLeanOne } from './mongoose-lean.util';
import {
  DEFAULT_PUSH_CATEGORIES,
  NOTIFICATION_CATEGORY,
  type NotificationType,
} from './notifications/notification-types';
import { NotificationSchema } from '../modules/platform/schemas/notification.schema';
import { PushSubscriptionSchema } from '../modules/platform/schemas/push-subscription.schema';
import { UserSchema } from '../modules/auth/schemas/user.schema';

function loadEnvFile() {
  const envPath = resolve(__dirname, '../../.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

type PushCategoryPrefs = Record<string, boolean>;

function loadWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error('VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são obrigatórios no .env');
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('web-push') as {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
      sendNotification: (subscription: object, payload: string) => Promise<{ statusCode?: number }>;
    };
  } catch {
    throw new Error('Pacote web-push não instalado. Rode: npm install web-push --workspace backend');
  }
}

async function userAllowsPush(
  User: Model<any>,
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const user = asLeanOne<{ pushCategories?: Partial<PushCategoryPrefs> }>(
    await User.findById(userId).select('pushCategories').lean(),
  );
  if (!user) return false;
  const category = NOTIFICATION_CATEGORY[type];
  const prefs = { ...DEFAULT_PUSH_CATEGORIES, ...(user.pushCategories || {}) };
  return prefs[category] !== false;
}

async function runReplay() {
  if (process.env.PUSH_REPLAY_CONFIRM !== '1') {
    console.error(
      'Confirme a operação definindo PUSH_REPLAY_CONFIRM=1.\n' +
        'Exemplo: PUSH_REPLAY_CONFIRM=1 npm run push:replay --workspace backend',
    );
    process.exit(1);
  }

  loadEnvFile();
  const webpush = loadWebPush();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@finance.local',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  await connect(mongoUri);
  console.log('Conectado ao MongoDB');

  const Notification = model('Notification', NotificationSchema);
  const PushSubscription = model('PushSubscription', PushSubscriptionSchema);
  const User = model('User', UserSchema);

  const subscriptionCount = await PushSubscription.countDocuments();
  if (subscriptionCount === 0) {
    console.warn(
      'Nenhum dispositivo inscrito em push. Abra o app no navegador, aceite notificações e tente de novo.',
    );
    await connection.close();
    process.exit(0);
  }

  const pending = asLeanMany<{
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    url?: string;
  }>(
    await Notification.find({ pushSentAt: { $exists: false } })
      .sort({ createdAt: 1 })
      .lean(),
  );

  if (pending.length === 0) {
    console.log('Nenhuma notificação pendente de push.');
    await connection.close();
    return;
  }

  console.log(`Reenviando push de ${pending.length} notificação(ões)...`);

  let sent = 0;
  let skippedNoSub = 0;
  let skippedPrefs = 0;
  let failed = 0;

  for (const notification of pending) {
    const userId = String(notification.userId);
    if (!(await userAllowsPush(User, userId, notification.type))) {
      skippedPrefs += 1;
      continue;
    }

    const subs = asLeanMany<{
      _id: Types.ObjectId;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }>(await PushSubscription.find({ userId: notification.userId }).lean());

    if (subs.length === 0) {
      skippedNoSub += 1;
      continue;
    }

    let delivered = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: notification.title,
            body: notification.message,
            url: notification.url || '/',
            type: notification.type,
          }),
        );
        delivered = true;
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.warn(`Falha push (${statusCode ?? '?'}): ${notification.title} → ${sub.endpoint}`);
        }
      }
    }

    if (delivered) {
      await Notification.updateOne({ _id: notification._id }, { $set: { pushSentAt: new Date() } });
      sent += 1;
      console.log(`✓ ${notification.title} → usuário ${userId}`);
    } else {
      failed += 1;
    }
  }

  console.log('');
  console.log('Resumo:');
  console.log(`  Enviadas:              ${sent}`);
  console.log(`  Sem inscrição push:    ${skippedNoSub}`);
  console.log(`  Bloqueadas por prefs:  ${skippedPrefs}`);
  console.log(`  Falha de entrega:      ${failed}`);

  await connection.close();
}

if (require.main === module) {
  runReplay().catch((err) => {
    console.error('push:replay falhou', err);
    process.exit(1);
  });
}
