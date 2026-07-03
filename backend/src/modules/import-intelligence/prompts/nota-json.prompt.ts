export const PROMPT_NOTA_JSON_VERSION = 'PROMPT_NOTA_JSON_v1';

export function buildNotaJsonPrompt(params: {
  sanitizedStructure: string;
  ragContext: string;
}): string {
  return `Você é um analista de dados financeiros do sistema Fecho.
Analise a estrutura JSON de extrato bancário (array de objetos) e retorne APENAS JSON válido.

Schema de resposta (mesmo do CSV):
{
  "banco_label_suggested": "string",
  "mapping": {
    "header_row": 1,
    "delimiter": ",",
    "columns": { "data": "campo_json|null", "valor": "...", "descricao": "...", "pagador_nome": "...", "transacao_id": "..." },
    "date_format": "DD/MM/YYYY" | "YYYY-MM-DD" | "auto",
    "decimal_format": "br" | "us",
    "tipo_movimento_rule": { "type": "sign" },
    "skip_row_patterns": []
  },
  "field_confidence": { "data": 0-1, "valor": 0-1 },
  "gaps": []
}

Para JSON, use nomes de campos do objeto em "columns" (não nomes de colunas CSV).
header_row deve ser 1 e delimiter ",".

Contexto RAG:
${params.ragContext || 'Nenhum'}

Estrutura sanitizada:
${params.sanitizedStructure}
`;
}
