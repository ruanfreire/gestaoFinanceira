import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { asLeanOne } from '../mongoose-lean.util';
import { getCurrentTenantId } from '../tenant/tenant-storage';
import {
  DEFAULT_ENABLED_MODULES,
  MODULE_CATALOG,
  type ModuleDefinition,
  type ModuleKey,
  normalizeEnabledModules,
  toggleModule,
} from './module-catalog';

type OrgEntitlementFields = {
  enabled_modules?: string[];
  emissao_nf_habilitada?: boolean;
  module_meta?: Record<string, unknown>;
};

export type ModuleCatalogItem = ModuleDefinition & {
  enabled: boolean;
  killSwitchActive: boolean;
};

@Injectable()
export class EntitlementsService {
  constructor(@InjectModel('Organization') private readonly organizationModel: Model<unknown>) {}

  isKillSwitchActive(moduleKey: ModuleKey): boolean {
    const envKey = `MODULE_KILL_SWITCH_${moduleKey.toUpperCase()}`;
    return process.env[envKey] === 'true';
  }

  resolveEnabledModules(org: OrgEntitlementFields | null | undefined): ModuleKey[] {
    const stored = org?.enabled_modules?.length
      ? normalizeEnabledModules(org.enabled_modules)
      : [...DEFAULT_ENABLED_MODULES];

    if (org?.emissao_nf_habilitada && !stored.includes('fiscal_emissao')) {
      stored.push('fiscal_emissao');
    }

    return normalizeEnabledModules(stored).filter((key) => !this.isKillSwitchActive(key));
  }

  async getEnabledModules(tenantId: string): Promise<ModuleKey[]> {
    const org = asLeanOne<OrgEntitlementFields>(
      await this.organizationModel.findById(tenantId).select('enabled_modules emissao_nf_habilitada').lean(),
    );
    return this.resolveEnabledModules(org);
  }

  async hasModule(tenantId: string, moduleKey: ModuleKey): Promise<boolean> {
    if (this.isKillSwitchActive(moduleKey)) return false;
    const enabled = await this.getEnabledModules(tenantId);
    return enabled.includes(moduleKey);
  }

  async hasModuleForCurrentTenant(moduleKey: ModuleKey): Promise<boolean> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return false;
    return this.hasModule(String(tenantId), moduleKey);
  }

  buildCatalog(enabledModules: ModuleKey[]): ModuleCatalogItem[] {
    const enabledSet = new Set(enabledModules);
    return MODULE_CATALOG.map((item) => ({
      ...item,
      enabled: enabledSet.has(item.key) && !this.isKillSwitchActive(item.key),
      killSwitchActive: this.isKillSwitchActive(item.key),
    }));
  }

  async getOrganizationModules(tenantId: string) {
    const org = asLeanOne<OrgEntitlementFields & { name?: string }>(
      await this.organizationModel.findById(tenantId).select('name enabled_modules emissao_nf_habilitada module_meta').lean(),
    );
    if (!org) return null;

    const enabled_modules = this.resolveEnabledModules(org);
    return {
      organization_id: tenantId,
      organization_name: org.name,
      enabled_modules,
      catalog: this.buildCatalog(enabled_modules),
      module_meta: org.module_meta ?? {},
    };
  }

  async updateOrganizationModules(
    tenantId: string,
    enabledModules: string[],
    performedBy: string,
  ) {
    const normalized = normalizeEnabledModules(enabledModules);
    const module_meta = {
      ...((
        await this.organizationModel.findById(tenantId).select('module_meta').lean()
      ) as OrgEntitlementFields | null)?.module_meta,
      last_updated_at: new Date(),
      last_updated_by: performedBy,
    };

    const org = await this.organizationModel.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          enabled_modules: normalized,
          module_meta,
          ...(normalized.includes('fiscal_emissao')
            ? { emissao_nf_habilitada: true }
            : { emissao_nf_habilitada: false }),
        },
      },
      { new: true },
    );

    if (!org) return null;

    const enabled_modules = this.resolveEnabledModules(org.toObject() as OrgEntitlementFields);
    return {
      organization_id: tenantId,
      enabled_modules,
      catalog: this.buildCatalog(enabled_modules),
      module_meta,
    };
  }

  async toggleOrganizationModule(
    tenantId: string,
    moduleKey: ModuleKey,
    enabled: boolean,
    performedBy: string,
  ) {
    const current = await this.getEnabledModules(tenantId);
    const next = toggleModule(current, moduleKey, enabled);
    return this.updateOrganizationModules(tenantId, next, performedBy);
  }
}
