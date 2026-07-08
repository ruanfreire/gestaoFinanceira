import { Injectable } from '@nestjs/common';
import type { PrefeituraEmissaoProvider } from './prefeitura-emissao.provider';
import type {
  PrefeituraEmitInput,
  PrefeituraEmitResult,
  PrefeituraEmissaoContext,
} from '../types/prefeitura-emissao.types';

/**
 * Emissão NFS-e via API oficial da Prefeitura de São Paulo.
 * @see docs/PREFEITURA-EMISSAO.md
 */
@Injectable()
export class SpNfseEmissaoProvider implements PrefeituraEmissaoProvider {
  readonly codigo = 'sp' as const;

  async emit(_input: PrefeituraEmitInput, context: PrefeituraEmissaoContext): Promise<PrefeituraEmitResult> {
    if (!context.empresa_cnpj?.trim()) {
      return {
        ok: false,
        error: 'CNPJ da organização é obrigatório para emissão na Prefeitura de São Paulo.',
      };
    }

    return {
      ok: false,
      error:
        'Integração com a API NFS-e da Prefeitura de São Paulo em implementação. ' +
        'Enquanto isso, desative a emissão automática ou use o registro local (PENDENTE_EMISSAO).',
    };
  }
}
