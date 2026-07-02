import type { Schema } from 'mongoose';
import { getCurrentTenantId } from './tenant-storage';

const QUERY_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'countDocuments',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'distinct',
] as const;

export function tenantPlugin(schema: Schema, options?: { optional?: boolean }) {
  const field = 'tenantId';

  for (const hook of QUERY_HOOKS) {
    schema.pre(hook, function applyTenantFilter() {
      const tenantId = getCurrentTenantId();
      if (!tenantId) return;
      this.where({ [field]: tenantId });
    });
  }

  schema.pre('aggregate', function applyTenantAggregate() {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return;
    this.pipeline().unshift({ $match: { [field]: tenantId } });
  });

  schema.pre('save', function stampTenantOnSave() {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      if (!options?.optional && !this.get(field)) {
        return;
      }
      return;
    }
    if (!this.get(field)) {
      this.set(field, tenantId);
    }
  });

  schema.pre('insertMany', function stampTenantOnInsert(next, docs: Record<string, unknown>[]) {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      next();
      return;
    }
    for (const doc of docs) {
      if (!doc[field]) doc[field] = tenantId;
    }
    next();
  });
}
