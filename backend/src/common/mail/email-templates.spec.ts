import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape-html.util';
import { passwordResetTemplate, renderEmailLayout, teamInviteTemplate } from './email-templates';

describe('email templates', () => {
  it('escapa HTML em conteúdo dinâmico', () => {
    const { html } = renderEmailLayout({
      title: '<script>alert(1)</script>',
      paragraphs: ['Empresa & Cia <teste>'],
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Empresa &amp; Cia');
  });

  it('gera convite de equipe com CTA', () => {
    const { html, text } = teamInviteTemplate({
      organizationName: 'Acme Ltda',
      inviterName: 'Maria',
      tenantRole: 'operator',
      inviteUrl: 'https://app.test/convite/abc',
      expiresAt: new Date('2026-12-31T12:00:00Z'),
    });
    expect(html).toContain('Aceitar convite');
    expect(html).toContain('https://app.test/convite/abc');
    expect(text).toContain('Acme Ltda');
    expect(escapeHtml('<x>')).toBe('&lt;x&gt;');
  });

  it('gera e-mail de redefinição de senha', () => {
    const { html } = passwordResetTemplate({
      name: 'Ruan',
      resetUrl: 'https://app.test/auth/redefinir-senha/abc',
      expiresAt: new Date('2026-12-31T12:00:00Z'),
    });
    expect(html).toContain('Criar nova senha');
    expect(html).toContain('https://app.test/auth/redefinir-senha/abc');
  });
});
