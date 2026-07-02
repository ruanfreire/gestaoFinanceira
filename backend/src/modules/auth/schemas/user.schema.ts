import { Schema } from 'mongoose';
import { USER_STATUSES } from '../../../common/constants/user-status';
import { TENANT_ROLES } from '../../../common/constants/tenant-role';

export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ['client'] },
    tenantRole: { type: String, enum: TENANT_ROLES, default: 'operator', index: true },
    status: { type: String, enum: USER_STATUSES, default: 'approved' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    company: { type: String },
    cnpj: { type: String },
    phone: { type: String },
    refreshTokens: { type: [String], default: [] },
    lastLogin: { type: Date },
    lastLoginIp: { type: String },
    pushCategories: {
      platform: { type: Boolean, default: true },
      imports: { type: Boolean, default: true },
      conciliation: { type: Boolean, default: true },
      billing: { type: Boolean, default: true },
      team: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);
