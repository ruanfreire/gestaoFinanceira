import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanOne } from '../../common/mongoose-lean.util';

@Injectable()
export class EmissaoNfConfigService {
  constructor(
    @InjectModel('Organization') private readonly organizationModel: Model<unknown>,
    @InjectModel('HonestIntegration') private readonly honestModel: Model<unknown>,
  ) {}

  async isEmissaoNfEnabled(tenantId?: string | Types.ObjectId | null): Promise<boolean> {
    if (!tenantId) return false;

    const org = asLeanOne<{ emissao_nf_habilitada?: boolean }>(
      await this.organizationModel
        .findById(new Types.ObjectId(String(tenantId)))
        .select('emissao_nf_habilitada')
        .lean(),
    );
    if (org?.emissao_nf_habilitada !== undefined) {
      return Boolean(org.emissao_nf_habilitada);
    }

    const honest = asLeanOne<{ emissao_nf_habilitada?: boolean }>(
      await this.honestModel
        .findOne({ tenantId: new Types.ObjectId(String(tenantId)) })
        .select('emissao_nf_habilitada')
        .lean(),
    );
    return Boolean(honest?.emissao_nf_habilitada);
  }
}
