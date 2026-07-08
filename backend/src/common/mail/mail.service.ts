import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { resolveFrontendUrl } from '../frontend-url.util';
import {
  accountApprovedTemplate,
  accountRejectedTemplate,
  accountSuspendedTemplate,
  signupReceivedTemplate,
  teamInviteTemplate,
  welcomeTeamTemplate,
  passwordResetTemplate,
} from './email-templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    this.enabled = process.env.MAIL_ENABLED !== 'false' && Boolean(apiKey);
    this.client = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.RESEND_FROM?.trim() || 'Fecho <onboarding@resend.dev>';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private loginUrl(): string {
    return `${resolveFrontendUrl()}/auth/entrar`;
  }

  private async send(to: string, subject: string, html: string, text: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      this.logger.debug(`E-mail não enviado (desabilitado): ${subject} → ${to}`);
      return false;
    }

    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.warn(`Falha ao enviar e-mail "${subject}" para ${to}: ${error.message}`);
        return false;
      }

      this.logger.log(`E-mail enviado: ${subject} → ${to}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Erro ao enviar e-mail "${subject}" para ${to}: ${message}`);
      return false;
    }
  }

  async sendTeamInvite(params: {
    to: string;
    organizationName: string;
    inviterName: string;
    tenantRole: 'owner' | 'operator';
    inviteUrl: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const { html, text } = teamInviteTemplate(params);
    return this.send(
      params.to,
      `Convite para equipe — ${params.organizationName}`,
      html,
      text,
    );
  }

  async sendSignupReceived(params: { to: string; name: string; company: string }): Promise<boolean> {
    const { html, text } = signupReceivedTemplate({
      ...params,
      loginUrl: this.loginUrl(),
    });
    return this.send(params.to, 'Cadastro recebido — Fecho', html, text);
  }

  async sendAccountApproved(params: { to: string; name: string }): Promise<boolean> {
    const { html, text } = accountApprovedTemplate({
      ...params,
      loginUrl: this.loginUrl(),
    });
    return this.send(params.to, 'Acesso aprovado — Fecho', html, text);
  }

  async sendAccountRejected(params: { to: string; name: string }): Promise<boolean> {
    const { html, text } = accountRejectedTemplate(params);
    return this.send(params.to, 'Atualização do seu cadastro — Fecho', html, text);
  }

  async sendAccountSuspended(params: { to: string; name: string }): Promise<boolean> {
    const { html, text } = accountSuspendedTemplate(params);
    return this.send(params.to, 'Acesso suspenso — Fecho', html, text);
  }

  async sendWelcomeTeam(params: {
    to: string;
    name: string;
    organizationName: string;
    tenantRole: 'owner' | 'operator';
    pendingApproval: boolean;
  }): Promise<boolean> {
    const { html, text } = welcomeTeamTemplate({
      ...params,
      loginUrl: this.loginUrl(),
    });
    const subject = params.pendingApproval
      ? `Conta criada em ${params.organizationName}`
      : `Bem-vindo à equipe ${params.organizationName}`;
    return this.send(params.to, subject, html, text);
  }

  async sendPasswordReset(params: {
    to: string;
    name: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const { html, text } = passwordResetTemplate(params);
    return this.send(params.to, 'Redefinir sua senha — Fecho', html, text);
  }
}
