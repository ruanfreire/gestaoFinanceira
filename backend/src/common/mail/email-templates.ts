import { escapeHtml } from './escape-html.util';

const BRAND = '#0b3d4c';
const BRAND_LIGHT = '#e8f4f6';
const TEXT = '#1a2b33';
const MUTED = '#5c6b73';

export type EmailCta = {
  label: string;
  href: string;
};

export type EmailLayoutOptions = {
  preheader?: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  cta?: EmailCta;
  footerNote?: string;
  highlight?: string;
};

function roleLabel(role: 'owner' | 'operator'): string {
  return role === 'owner' ? 'Proprietário' : 'Operador';
}

function formatDatePt(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

export function renderEmailLayout(options: EmailLayoutOptions): { html: string; text: string } {
  const preheader = options.preheader ?? options.title;
  const paragraphsHtml = options.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT};">${escapeHtml(p)}</p>`)
    .join('');

  const bulletsHtml = options.bullets?.length
    ? `<ul style="margin:0 0 20px;padding-left:20px;color:${TEXT};font-size:15px;line-height:1.7;">
        ${options.bullets.map((b) => `<li style="margin-bottom:8px;">${escapeHtml(b)}</li>`).join('')}
      </ul>`
    : '';

  const highlightHtml = options.highlight
    ? `<div style="margin:0 0 24px;padding:16px 18px;border-radius:12px;background:${BRAND_LIGHT};border:1px solid #c5e4ea;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND};font-weight:600;">${escapeHtml(options.highlight)}</p>
      </div>`
    : '';

  const ctaHtml = options.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
        <tr>
          <td style="border-radius:10px;background:${BRAND};">
            <a href="${escapeHtml(options.cta.href)}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
              ${escapeHtml(options.cta.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${MUTED};word-break:break-all;">
        Ou copie o link: <a href="${escapeHtml(options.cta.href)}" style="color:${BRAND};">${escapeHtml(options.cta.href)}</a>
      </p>`
    : '';

  const eyebrowHtml = options.eyebrow
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND};">${escapeHtml(options.eyebrow)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f8;font-family:'Segoe UI',Inter,system-ui,-apple-system,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 20px;text-align:center;">
              <div style="display:inline-block;padding:10px 18px;border-radius:999px;background:${BRAND};color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Fecho</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:18px;border:1px solid #e2eaed;box-shadow:0 12px 40px rgba(11,61,76,0.08);padding:36px 32px;">
              ${eyebrowHtml}
              <h1 style="margin:0 0 20px;font-size:28px;line-height:1.25;font-weight:700;color:${TEXT};letter-spacing:-0.02em;">${escapeHtml(options.title)}</h1>
              ${highlightHtml}
              ${paragraphsHtml}
              ${bulletsHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};">
                ${escapeHtml(options.footerNote ?? 'Concilie notas, extratos e recebimentos sem planilha.')}
              </p>
              <p style="margin:0;font-size:12px;color:#8a979d;">© ${new Date().getFullYear()} Fecho</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    options.title,
    '',
    ...options.paragraphs,
    ...(options.bullets ?? []).map((b) => `• ${b}`),
    ...(options.highlight ? ['', options.highlight] : []),
    ...(options.cta ? ['', `${options.cta.label}: ${options.cta.href}`] : []),
  ];

  return { html, text: textParts.join('\n') };
}

export function teamInviteTemplate(params: {
  organizationName: string;
  inviterName: string;
  tenantRole: 'owner' | 'operator';
  inviteUrl: string;
  expiresAt: Date;
}) {
  const role = roleLabel(params.tenantRole);
  return renderEmailLayout({
    preheader: `Você foi convidado para ${params.organizationName} no Fecho`,
    eyebrow: 'Convite de equipe',
    title: `Entre na equipe de ${params.organizationName}`,
    highlight: `${params.inviterName} convidou você como ${role}.`,
    paragraphs: [
      'Use o botão abaixo para criar sua senha e aceitar o convite. O link é pessoal e não deve ser compartilhado.',
      `Este convite expira em ${formatDatePt(params.expiresAt)}.`,
    ],
    bullets: [
      'Acesso à organização no Fecho',
      `Papel: ${role}`,
      'Defina sua senha no primeiro acesso',
    ],
    cta: { label: 'Aceitar convite', href: params.inviteUrl },
    footerNote: 'Se você não esperava este convite, pode ignorar este e-mail.',
  });
}

export function signupReceivedTemplate(params: { name: string; company: string; loginUrl: string }) {
  return renderEmailLayout({
    preheader: 'Recebemos seu cadastro no Fecho',
    eyebrow: 'Cadastro recebido',
    title: 'Estamos analisando seu acesso',
    highlight: `Olá, ${params.name}! Recebemos o cadastro de ${params.company}.`,
    paragraphs: [
      'Nossa equipe vai revisar sua solicitação em breve. Assim que for aprovada, você receberá outro e-mail e poderá entrar normalmente.',
      'Enquanto isso, não é necessário fazer nada — guardamos seus dados com segurança.',
    ],
    cta: { label: 'Ir para o login', href: params.loginUrl },
  });
}

export function accountApprovedTemplate(params: { name: string; loginUrl: string }) {
  return renderEmailLayout({
    preheader: 'Seu acesso ao Fecho foi aprovado',
    eyebrow: 'Acesso liberado',
    title: 'Bem-vindo ao Fecho',
    highlight: `${params.name}, seu cadastro foi aprovado.`,
    paragraphs: [
      'Você já pode entrar e começar a conciliar notas, extratos e recebimentos com sua equipe.',
    ],
    cta: { label: 'Entrar no Fecho', href: params.loginUrl },
  });
}

export function accountRejectedTemplate(params: { name: string }) {
  return renderEmailLayout({
    preheader: 'Atualização sobre seu cadastro no Fecho',
    eyebrow: 'Cadastro não aprovado',
    title: 'Não foi possível liberar seu acesso',
    paragraphs: [
      `Olá, ${params.name}. Analisamos seu cadastro e, neste momento, não conseguimos aprová-lo.`,
      'Se acredita que houve um engano, responda este e-mail ou fale com o administrador que indicou o Fecho.',
    ],
  });
}

export function accountSuspendedTemplate(params: { name: string }) {
  return renderEmailLayout({
    preheader: 'Seu acesso ao Fecho foi suspenso',
    eyebrow: 'Conta suspensa',
    title: 'Acesso temporariamente suspenso',
    paragraphs: [
      `Olá, ${params.name}. Seu acesso ao Fecho foi suspenso por um administrador.`,
      'Entre em contato com o suporte ou com o responsável pela sua organização para mais detalhes.',
    ],
  });
}

export function welcomeTeamTemplate(params: {
  name: string;
  organizationName: string;
  tenantRole: 'owner' | 'operator';
  loginUrl: string;
  pendingApproval: boolean;
}) {
  const role = roleLabel(params.tenantRole);
  if (params.pendingApproval) {
    return renderEmailLayout({
      preheader: `Conta criada em ${params.organizationName}`,
      eyebrow: 'Equipe',
      title: 'Conta criada com sucesso',
      highlight: `${params.name}, você entrou em ${params.organizationName} como ${role}.`,
      paragraphs: [
        'Sua conta foi criada, mas a organização ainda aguarda aprovação final. Você receberá um e-mail quando puder entrar.',
      ],
      cta: { label: 'Página de login', href: params.loginUrl },
    });
  }

  return renderEmailLayout({
    preheader: `Bem-vindo à equipe ${params.organizationName}`,
    eyebrow: 'Equipe',
    title: 'Tudo pronto para começar',
    highlight: `${params.name}, você agora faz parte de ${params.organizationName} como ${role}.`,
    paragraphs: [
      'Entre no Fecho para acompanhar documentos, conciliações e o dia a dia financeiro da equipe.',
    ],
    cta: { label: 'Entrar no Fecho', href: params.loginUrl },
  });
}

export function passwordResetTemplate(params: {
  name: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  return renderEmailLayout({
    preheader: 'Redefina sua senha do Fecho',
    eyebrow: 'Segurança',
    title: 'Redefinir sua senha',
    highlight: `Olá, ${params.name}. Recebemos um pedido para alterar a senha da sua conta.`,
    paragraphs: [
      'Clique no botão abaixo para escolher uma nova senha. O link é de uso único e expira em breve.',
      `Válido até ${formatDatePt(params.expiresAt)}.`,
      'Se você não solicitou esta alteração, ignore este e-mail — sua senha atual continua válida.',
    ],
    bullets: [
      'O link funciona apenas uma vez',
      'Após redefinir, faça login com a nova senha',
      'Sessões antigas serão encerradas por segurança',
    ],
    cta: { label: 'Criar nova senha', href: params.resetUrl },
    footerNote: 'Nunca compartilhe este link com outras pessoas.',
  });
}
