import { Schema } from 'mongoose';
import { TENANT_ROLES } from '../../../common/constants/tenant-role';

export const INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;

export const OrganizationInviteSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tenantRole: { type: String, enum: TENANT_ROLES, default: 'operator' },
    tokenHash: { type: String, required: true, unique: true },
    status: { type: String, enum: INVITE_STATUSES, default: 'pending', index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date },
    acceptedUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

OrganizationInviteSchema.index({ tenantId: 1, email: 1, status: 1 });
