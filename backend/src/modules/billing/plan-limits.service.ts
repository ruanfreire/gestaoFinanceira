import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanOne } from '../../common/mongoose-lean.util';
import { getPlanLimits, type PlanId } from '../../common/billing/plans.config';
import { getCurrentTenantId } from '../../common/tenant/tenant-storage';

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectModel('Organization') private organizationModel: Model<any>,
    @InjectModel('Nota') private notaModel: Model<any>,
    @InjectModel('Importacao') private importacaoModel: Model<any>,
    @InjectModel('BankImportacao') private bankImportacaoModel: Model<any>,
  ) {}

  private monthRange(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  async getUsage(tenantId?: Types.ObjectId | null) {
    const resolvedTenantId = tenantId ?? getCurrentTenantId();
    if (!resolvedTenantId) {
      return { notas: 0, importsThisMonth: 0 };
    }

    const { start, end } = this.monthRange();
    const dateFilter = { tenantId: resolvedTenantId, createdAt: { $gte: start, $lt: end } };
    const [notas, faturas, extratos] = await Promise.all([
      this.notaModel.countDocuments({ tenantId: resolvedTenantId }),
      this.importacaoModel.countDocuments(dateFilter),
      this.bankImportacaoModel.countDocuments(dateFilter),
    ]);

    return { notas, importsThisMonth: faturas + extratos };
  }

  async assertCanImport(extraCount = 1) {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return;

    const org = asLeanOne<{ plan?: PlanId }>(
      await this.organizationModel.findById(tenantId).select('plan').lean(),
    );
    const plan = org?.plan ?? 'trial';
    const limits = getPlanLimits(plan);
    if (limits.maxImportsPerMonth == null) return;

    const usage = await this.getUsage(tenantId);
    if (usage.importsThisMonth + extraCount > limits.maxImportsPerMonth) {
      throw new ForbiddenException(
        `Limite do plano atingido: ${limits.maxImportsPerMonth} importações por mês. Faça upgrade em Configurações → Plano.`,
      );
    }
  }

  async assertCanCreateNotas(extraCount = 1) {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return;

    const org = asLeanOne<{ plan?: PlanId }>(
      await this.organizationModel.findById(tenantId).select('plan').lean(),
    );
    const plan = org?.plan ?? 'trial';
    const limits = getPlanLimits(plan);
    if (limits.maxNotas == null) return;

    const usage = await this.getUsage(tenantId);
    if (usage.notas + extraCount > limits.maxNotas) {
      throw new ForbiddenException(
        `Limite do plano atingido: ${limits.maxNotas} notas. Faça upgrade em Configurações → Plano.`,
      );
    }
  }
}
