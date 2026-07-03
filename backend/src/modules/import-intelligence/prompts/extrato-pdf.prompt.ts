export const PROMPT_EXTRATO_PDF_VERSION = 'PROMPT_EXTRATO_PDF_v1';

export function buildExtratoPdfPrompt(ragContext: string): string {
  return `Você é um analista de dados financeiros do sistema Fecho.
Analise o extrato bancário em PDF e retorne APENAS JSON válido com o mapeamento sugerido.

Extraia os nomes das colunas visíveis na tabela de lançamentos e sugira o mapeamento para:
- data (obrigatório)
- valor (obrigatório)
- descricao
- pagador_nome
- transacao_id

Schema:
{
  "banco_label_suggested": "string",
  "mapping": {
    "header_row": 1,
    "delimiter": ";" | "," | "\\t",
    "columns": { "data": "string|null", "valor": "...", "descricao": "...", "pagador_nome": "...", "transacao_id": "..." },
    "date_format": "DD/MM/YYYY" | "YYYY-MM-DD" | "auto",
    "decimal_format": "br" | "us",
    "tipo_movimento_rule": { "type": "sign" },
    "skip_row_patterns": ["Saldo", "SALDO"]
  },
  "field_confidence": {},
  "gaps": [{ "field": "string", "severity": "warning|error", "message": "string" }]
}

Se o PDF não contiver tabela de lançamentos legível, retorne gaps com severity error.

Contexto RAG:
${ragContext || 'Nenhum'}
`;
}
