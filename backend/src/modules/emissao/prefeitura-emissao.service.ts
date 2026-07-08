import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanOne } from '../../common/mongoose-lean.util';
import { SpNfseEmissaoProvider } from './providers/sp-nfse-emissao.provider';
import type { PrefeituraEmissaoProvider } from './providers/prefeitura-emissao.provider';
import type {
  PrefeituraCodigo,
  PrefeituraEmitInput,
  PrefeituraEmitResult,
} from './types/prefeitura-emissao.types';
import { mapPrefeituraEmitErrorMessage } from './prefeitura-emissao.util';

@Injectable()
export class PrefeituraEmissaoService {
  private readonly providers: Map<PrefeituraCodigo, PrefeituraEmissaoProvider>;

  constructor(
    @InjectModel('Organization') private readonly organizationModel: Model<unknown>,
    spProvider: SpNfseEmissaoProvider,
  ) {
    this.providers = new Map([[spProvider.codigo, spProvider]]);
  }

  async emit(tenantId: string, input: PrefeituraEmitInput): Promise<PrefeituraEmitResult> {
    const org = asLeanOne<{
      name?: string;
      cnpj?: string;
      prefeitura_codigo?: PrefeituraCodigo;
    }>(
      await this.organizationModel
        .findById(new Types.ObjectId(tenantId))
        .select('name cnpj prefeitura_codigo')
        .lean(),
    );

    const codigo = org?.prefeitura_codigo;
    if (!codigo) {
      return {
        ok: false,
        error: 'Selecione a prefeitura em Configurações → Emissão NFS-e.',
      };
    }

    const provider = this.providers.get(codigo);
    if (!provider) {
      return {
        ok: false,
        error: `Prefeitura "${codigo}" ainda não possui integração de emissão neste sistema.`,
      };
    }

    const result = await provider.emit(input, {
      tenantId,
      empresa_cnpj: org?.cnpj,
      empresa_nome: org?.name,
    });

    if (!result.ok && result.error) {
      return { ...result, error: mapPrefeituraEmitErrorMessage(result.error) };
    }

    return result;
  }
}
