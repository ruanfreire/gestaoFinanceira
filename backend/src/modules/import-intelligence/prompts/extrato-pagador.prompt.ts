export const PROMPT_PAGADOR_VERSION = 'PROMPT_EXTRATO_PAGADOR_v1';

export type PagadorExtractionInput = {
  id: string;
  descricao: string;
};

export function buildExtratoPagadorPrompt(items: PagadorExtractionInput[]): string {
  return `Você é um analista financeiro do sistema Fecho.
Extraia o nome da empresa ou pessoa pagadora a partir da descrição de lançamentos bancários brasileiros.

Retorne APENAS JSON válido (sem markdown):
{
  "items": [
    { "id": "string", "pagador_nome": "string|null", "confidence": 0-1 }
  ]
}

Regras de extração:
- O nome do pagador está quase sempre embutido em "O que foi" / descrição / histórico.
- Remova prefixos bancários: "Pix recebido", "Transferência recebida", "TED recebida", "Cobrança recebida", etc.
- Remova CPF, CNPJ, asteriscos de documento e códigos numéricos.
- Mantenza razão social quando existir (LTDA, ME, EIRELI, S/A, etc.).
- Use capitalização natural (Title Case), preservando siglas (LTDA, ME, CNPJ).
- Não invente nomes. Se não houver pagador identificável, use pagador_nome: null e confidence baixa.
- Tarifas, taxas, juros e movimentos internos do banco → pagador_nome: null.
- confidence >= 0.7 apenas quando o nome estiver claro na descrição.

Lançamentos (id | descrição):
${items.map((item) => `${item.id} | ${item.descricao}`).join('\n')}
`;
}
