export type HonestEmitInput = {
  tomador_nome: string;
  tomador_documento: string;
  tomador_email?: string;
  valor: number;
  codigo_servico: string;
  discriminacao: string;
  aliquota_iss?: number;
  data_competencia?: string;
};

export type HonestEmitResult = {
  ok: boolean;
  nota_api_id?: string;
  numero?: string;
  link_prefeitura?: string;
  status_emissao?: string;
  error?: string;
  raw?: unknown;
};

export function buildHonestEmitNfRequest(empresaId: number, input: HonestEmitInput) {
  const query = `mutation NfEmitir($empresaId: Int!, $input: NfEmitirInput!) {
  nf_emitir(empresaId: $empresaId, input: $input) {
    id
    numero
    link_prefeitura
    status_emissao
    status
  }
}`;

  return {
    operationName: 'NfEmitir',
    query,
    variables: {
      empresaId,
      input: {
        tomador_nome: input.tomador_nome,
        tomador_documento: input.tomador_documento,
        tomador_email: input.tomador_email,
        valor: String(input.valor.toFixed(2)),
        codigo_servico: input.codigo_servico,
        discriminacao: input.discriminacao,
        aliquota_iss: input.aliquota_iss,
        data_competencia: input.data_competencia,
      },
    },
  };
}

function readNestedString(payload: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = path.split('.');
    let current: unknown = payload;
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (typeof current === 'string' && current.trim()) return current.trim();
    if (typeof current === 'number' && Number.isFinite(current)) return String(current);
  }
  return undefined;
}

export function parseHonestEmitResponse(json: unknown): HonestEmitResult {
  const errors = (json as { errors?: Array<{ message?: string }> })?.errors;
  if (errors?.length) {
    return {
      ok: false,
      error: errors.map((item) => item.message).filter(Boolean).join('; ') || 'Falha na emissão Honest',
      raw: json,
    };
  }

  const data = (json as { data?: Record<string, unknown> })?.data;
  const emitted =
    (data?.nf_emitir as Record<string, unknown> | undefined) ??
    (data?.nfEmitir as Record<string, unknown> | undefined) ??
    (data?.emitir_nf as Record<string, unknown> | undefined);

  if (!emitted || typeof emitted !== 'object') {
    return {
      ok: false,
      error:
        'A Honest não retornou dados da nota emitida. Verifique se a mutation NfEmitir está disponível na API.',
      raw: json,
    };
  }

  const numero = readNestedString(emitted, ['numero', 'nf_numero']);
  const nota_api_id = readNestedString(emitted, ['id', 'nota_api_id']);
  const link_prefeitura = readNestedString(emitted, ['link_prefeitura', 'linkPrefeitura']);
  const status_emissao = readNestedString(emitted, ['status_emissao', 'statusEmissao', 'status']) ?? 'NORMAL';

  if (!numero && !nota_api_id) {
    return {
      ok: false,
      error: 'Resposta da Honest sem número ou identificador da nota.',
      raw: json,
    };
  }

  return {
    ok: true,
    nota_api_id,
    numero: numero ?? `HN-${nota_api_id}`,
    link_prefeitura,
    status_emissao,
    raw: json,
  };
}

export function mapHonestEmitErrorMessage(error?: string): string {
  const message = (error ?? '').toLowerCase();
  if (!message) return 'Não foi possível emitir a nota fiscal na Honest.';
  if (message.includes('documento') || message.includes('cpf') || message.includes('cnpj')) {
    return 'Documento do tomador inválido ou ausente na Honest. Revise o cadastro do tomador.';
  }
  if (message.includes('servico') || message.includes('serviço') || message.includes('codigo')) {
    return 'Código de serviço não reconhecido pela Honest. Ajuste o serviço padrão do tomador.';
  }
  if (message.includes('ccm') || message.includes('empresa')) {
    return 'Empresa emissora não configurada corretamente na Honest. Revise a integração.';
  }
  return error ?? 'Não foi possível emitir a nota fiscal na Honest.';
}
