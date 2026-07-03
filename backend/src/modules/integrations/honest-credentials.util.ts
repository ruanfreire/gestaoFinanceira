import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Credencial criptografada inválida');
  }
  const decipher = createDecipheriv(ALGO, deriveKey(secret), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function credentialsSecret(config: { get: (key: string) => string | undefined }): string {
  const dedicated = config.get('HONEST_CREDENTIALS_SECRET')?.trim();
  const fallback = config.get('INTEGRATIONS_CRON_SECRET')?.trim();
  const secret = dedicated || fallback;
  if (!secret) {
    throw new Error('HONEST_CREDENTIALS_SECRET ou INTEGRATIONS_CRON_SECRET não configurado');
  }
  return secret;
}

export function hashDiscoveryToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createDiscoveryToken(): string {
  return randomBytes(24).toString('base64url');
}
