export const PROMPT_NF_MAPPING_VERSION = 'PROMPT_NF_MAPPING_v1';

export function buildNfJsonMappingPrompt(params: {
  sanitizedStructure: string;
  heuristicJson: string;
  ragContext: string;
}): string {
  return `Você é um analista de dados do sistema Fecho (importação de notas fiscais em JSON).
Analise a estrutura do JSON e retorne APENAS JSON válido com o mapeamento para importar notas.

Schema de resposta:
{
  "profile_name_suggested": "string",
  "mapping": {
    "structure": "custom",
    "traversal": {
      "data_array": "nome_do_campo_array_raiz ou omita",
      "empresa_array": "empresa|empresas ou omita",
      "lista_array": "nf_lista|lotes ou omita",
      "items_array": "items|notas|invoices"
    },
    "item_fields": {
      "numero": "caminho.relativo|alias",
      "nota_api_id": "id|nota_api_id",
      "tomador": "tomador_nome|tomador|cliente.nome",
      "valor": "valor|valor_total",
      "data_emissao": "data_emissao",
      "data_competencia": "data_competencia|competencia",
      "status_emissao": "status_emissao|status"
    },
    "empresa_fields": {
      "id": "id",
      "nome": "nome|razao_social",
      "cnpj": "cnpj"
    },
    "skip_status_patterns": ["CANCEL"]
  },
  "field_confidence": { "numero": 0-1, "valor": 0-1, "tomador": 0-1 },
  "gaps": [{ "field": "string", "severity": "error|warning|info", "message": "string" }]
}

Regras:
- Use caminhos relativos ao objeto ITEM (nota), não JSONPath absoluto.
- traversal.* são nomes de propriedades JSON em cada nível (não use [*]).
- Para formato Honest (data→empresa→nf_lista→items), use structure custom com esses nomes.
- Campos podem usar | para alternativas.

Contexto RAG:
${params.ragContext || 'Nenhum'}

Heurística atual:
${params.heuristicJson}

Estrutura sanitizada do arquivo:
${params.sanitizedStructure}
`;
}
