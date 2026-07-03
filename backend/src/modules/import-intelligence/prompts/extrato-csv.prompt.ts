export const PROMPT_VERSION = 'PROMPT_EXTRATO_CSV_v1';

export function buildExtratoCsvPrompt(params: {
  sanitizedHeaders: string[];
  sanitizedSampleRows: string[][];
  ragContext: string;
  heuristicJson: string;
}): string {
  return `Você é um analista de dados financeiros do sistema Fecho.
Analise o extrato bancário CSV e retorne APENAS JSON válido (sem markdown).

Campos internos do Fecho:
- data (obrigatório)
- valor (obrigatório)
- descricao (recomendado)
- pagador_nome (recomendado; extraído da descrição se ausente)
- tipo_transacao (tipo da operação: Cobrança recebida, Pix, TED…)
- saldo (saldo após o lançamento, quando existir)
- documento (número de documento/comprovante)
- transacao_id (ID único; não confundir com tipo_transacao)

Schema de resposta:
{
  "banco_label_suggested": "string",
  "mapping": {
    "header_row": number,
    "delimiter": ";" | "," | "\\t",
    "columns": {
      "data": "nome_coluna|null",
      "valor": "...",
      "descricao": "...",
      "pagador_nome": "...",
      "tipo_transacao": "...",
      "saldo": "...",
      "documento": "...",
      "transacao_id": "..."
    },
    "date_format": "DD/MM/YYYY" | "YYYY-MM-DD" | "auto",
    "decimal_format": "br" | "us",
    "tipo_movimento_rule": { "type": "sign" },
    "skip_row_patterns": ["string"]
  },
  "field_confidence": { "data": 0-1, "valor": 0-1, "descricao": 0-1, "pagador_nome": 0-1, "transacao_id": 0-1, "header_row": 0-1 },
  "gaps": [{ "field": "string", "severity": "error|warning|info", "message": "string" }]
}

Regras:
- Não invente colunas que não existam nos headers.
- Prefira o mapeamento heurístico quando confidence >= 0.9.
- Se não tiver certeza, use null e severity warning/error em gaps.
- Quando não houver coluna pagador_nome/Quem pagou, mapeie descricao e deixe pagador_nome como null (extração automática na descrição).
- Coluna "Transação" em extratos Asaas é tipo_transacao, não transacao_id.
- Coluna "Saldo" deve ir em saldo; preserve todas as colunas reconhecíveis no mapeamento.
- Identifique padrões do banco no histórico (Pix recebido de X, TED RECEBIDA Y, etc.).

Contexto RAG (perfis similares):
${params.ragContext || 'Nenhum'}

Heurística atual:
${params.heuristicJson}

Headers (sanitizados):
${params.sanitizedHeaders.join(' | ')}

Amostra sanitizada (5 linhas):
${params.sanitizedSampleRows.map((row) => row.join(' | ')).join('\n')}
`;
}
