import { Schema } from 'mongoose';
import { USER_STATUSES } from '../../../common/constants/user-status';

const PLAN_IDS = ['trial', 'starter', 'pro'] as const;
const BILLING_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'none'] as const;

export const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    cnpj: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: { type: String, enum: USER_STATUSES, default: 'pending', index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    trialEndsAt: { type: Date },
    plan: { type: String, enum: PLAN_IDS, default: 'trial', index: true },
    billingStatus: { type: String, enum: BILLING_STATUSES, default: 'trialing', index: true },
    stripeCustomerId: { type: String, index: true, sparse: true },
    stripeSubscriptionId: { type: String, index: true, sparse: true },
    currentPeriodEnd: { type: Date },
    planActivatedAt: { type: Date },
  },
  { timestamps: true },
);
