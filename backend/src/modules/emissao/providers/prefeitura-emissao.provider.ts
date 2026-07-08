import type {
  PrefeituraCodigo,
  PrefeituraEmitInput,
  PrefeituraEmitResult,
  PrefeituraEmissaoContext,
} from '../types/prefeitura-emissao.types';

export interface PrefeituraEmissaoProvider {
  readonly codigo: PrefeituraCodigo;
  emit(input: PrefeituraEmitInput, context: PrefeituraEmissaoContext): Promise<PrefeituraEmitResult>;
}
