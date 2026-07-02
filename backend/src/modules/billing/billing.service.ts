import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { asLeanOne } from '../../common/mongoose-lean.util';
import {
  BILLABLE_PLANS,
  PLAN_DEFINITIONS,
  type BillingStatus,
  type PlanId,
  getPlanLimits,
  resolveStripePriceId,
} from '../../common/billing/plans.config';
import {
  BILLING_ACCESS_MESSAGES,
  computeBillingAccess,
  type BillingAccess,
} from '../../common/billing/organization-billing.util';
import { PlanLimitsService } from './plan-limits.service';
import { resolveFrontendUrl } from '../../common/frontend-url.util';

type OrganizationDoc = {
  _id: Types.ObjectId;
  name: string;
  status?: string;
  ownerUserId?: Types.ObjectId;
  plan?: PlanId;
  billingStatus?: BillingStatus;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(
    @InjectModel('Organization') private organizationModel: Model<any>,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  private getStripe(): Stripe {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('Pagamentos não configurados no servidor');
    }
    if (!this.stripe) {
      this.stripe = new Stripe(secret);
    }
    return this.stripe;
  }

  isStripeConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  }

  private frontendUrl(): string {
    return resolveFrontendUrl();
  }

  private async getOrganizationForTenant(tenantId: string): Promise<OrganizationDoc> {
    const org = asLeanOne<OrganizationDoc>(
      await this.organizationModel.findById(tenantId).lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
    switch (status) {
      case 'trialing':
        return 'trialing';
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
        return 'canceled';
      case 'unpaid':
        return 'unpaid';
      default:
        return 'none';
    }
  }

  private mapPlanFromPriceId(priceId?: string | null): PlanId {
    if (!priceId) return 'starter';
    const starter = resolveStripePriceId('starter');
    const pro = resolveStripePriceId('pro');
    if (pro && priceId === pro) return 'pro';
    if (starter && priceId === starter) return 'starter';
    return 'starter';
  }

  getBillingAccess(org: OrganizationBillingSnapshotInput): BillingAccess {
    return computeBillingAccess(org);
  }

  async assertBillingAccess(tenantId: string) {
    const org = await this.getOrganizationForTenant(tenantId);
    const access = computeBillingAccess(org);
    if (!access.allowed) {
      const reason = access.reason ?? 'subscription_inactive';
      throw new ForbiddenException(BILLING_ACCESS_MESSAGES[reason]);
    }
    return { org, access };
  }

  listPlans() {
    return BILLABLE_PLANS.map((planId) => {
      const definition = PLAN_DEFINITIONS[planId];
      const priceId = resolveStripePriceId(planId);
      return {
        id: planId,
        name: definition.name,
        description: definition.description,
        priceLabel: definition.priceLabel,
        limits: definition.limits,
        available: Boolean(priceId),
      };
    });
  }

  async getStatus(tenantId: string) {
    const org = await this.getOrganizationForTenant(tenantId);
    const access = computeBillingAccess(org);
    const plan = org.plan ?? 'trial';
    const usage = await this.planLimitsService.getUsage(new Types.ObjectId(tenantId));
    return {
      plan,
      billingStatus: org.billingStatus ?? 'none',
      trialEndsAt: org.trialEndsAt,
      currentPeriodEnd: org.currentPeriodEnd,
      limits: getPlanLimits(plan),
      usage,
      access,
      stripeConfigured: this.isStripeConfigured(),
      hasSubscription: Boolean(org.stripeSubscriptionId),
    };
  }

  async createCheckoutSession(tenantId: string, userId: string, plan: Exclude<PlanId, 'trial'>) {
    if (!this.isStripeConfigured()) {
      throw new ServiceUnavailableException('Stripe não configurado');
    }

    const priceId = resolveStripePriceId(plan);
    if (!priceId) {
      throw new BadRequestException(`Plano ${plan} indisponível no momento`);
    }

    const org = await this.getOrganizationForTenant(tenantId);
    if (org.status !== 'approved') {
      throw new ForbiddenException('Organização aguardando aprovação para assinar um plano');
    }

    const stripe = this.getStripe();
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          organizationId: String(org._id),
          ownerUserId: userId,
        },
      });
      customerId = customer.id;
      await this.organizationModel.findByIdAndUpdate(org._id, {
        $set: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl()}/configuracoes/plano?checkout=success`,
      cancel_url: `${this.frontendUrl()}/configuracoes/plano?checkout=cancel`,
      client_reference_id: String(org._id),
      metadata: {
        organizationId: String(org._id),
        plan,
      },
      subscription_data: {
        metadata: {
          organizationId: String(org._id),
          plan,
        },
      },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Não foi possível iniciar o checkout');
    }

    return { url: session.url };
  }

  async createPortalSession(tenantId: string) {
    if (!this.isStripeConfigured()) {
      throw new ServiceUnavailableException('Stripe não configurado');
    }

    const org = await this.getOrganizationForTenant(tenantId);
    if (!org.stripeCustomerId) {
      throw new BadRequestException('Nenhuma assinatura encontrada para esta organização');
    }

    const stripe = this.getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${this.frontendUrl()}/configuracoes/plano`,
    });

    return { url: session.url };
  }

  private resolveSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | undefined {
    const end = subscription.items?.data?.[0]?.current_period_end;
    return end ? new Date(end * 1000) : undefined;
  }

  async applySubscriptionUpdate(
    organizationId: string,
    subscription: Stripe.Subscription,
    fallbackPlan?: PlanId,
  ) {
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = fallbackPlan ?? this.mapPlanFromPriceId(priceId);
    const billingStatus = this.mapStripeStatus(subscription.status);
    const currentPeriodEnd = this.resolveSubscriptionPeriodEnd(subscription);

    await this.organizationModel.findByIdAndUpdate(organizationId, {
      $set: {
        plan,
        billingStatus,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId:
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id,
        currentPeriodEnd,
        planActivatedAt: new Date(),
      },
    });
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId || session.client_reference_id;
    if (!organizationId) return;

    const stripe = this.getStripe();
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const plan = (session.metadata?.plan as PlanId | undefined) ?? undefined;
    await this.applySubscriptionUpdate(organizationId, subscription, plan);
  }

  constructWebhookEvent(payload: Buffer, signature: string | string[] | undefined) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('Webhook Stripe não configurado');
    }
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(payload, String(signature ?? ''), secret);
  }

  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organizationId;
        if (!organizationId) break;
        if (event.type === 'customer.subscription.deleted') {
          await this.organizationModel.findByIdAndUpdate(organizationId, {
            $set: {
              billingStatus: 'canceled',
              currentPeriodEnd: subscription.ended_at
                ? new Date(subscription.ended_at * 1000)
                : new Date(),
            },
          });
          break;
        }
        await this.applySubscriptionUpdate(organizationId, subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;
        if (!subscriptionId) break;
        const stripe = this.getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const organizationId = subscription.metadata?.organizationId;
        if (!organizationId) break;
        await this.organizationModel.findByIdAndUpdate(organizationId, {
          $set: { billingStatus: 'past_due' },
        });
        break;
      }
      default:
        break;
    }
  }
}

type OrganizationBillingSnapshotInput = {
  plan?: PlanId;
  billingStatus?: BillingStatus;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
};
