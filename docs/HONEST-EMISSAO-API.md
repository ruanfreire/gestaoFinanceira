# Honest — API de emissão de NF

**Status:** integração experimental (opt-in via `emissao_nf_habilitada`)  
**Implementação:** `backend/src/modules/integrations/honest-emissao.util.ts`

## Contexto

A sincronização existente usa a query GraphQL `NfsEmitidas` (somente leitura).  
A emissão a partir de pagamento usa a mutation `NfEmitir`, enviada para o mesmo endpoint GraphQL da Honest.

## Mutation

```graphql
mutation NfEmitir($empresaId: Int!, $input: NfEmitirInput!) {
  nf_emitir(empresaId: $empresaId, input: $input) {
    id
    numero
    link_prefeitura
    status_emissao
    status
  }
}
```

### Variáveis (`NfEmitirInput`)

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `tomador_nome` | string | Sim |
| `tomador_documento` | string (CPF/CNPJ) | Sim |
| `tomador_email` | string | Não |
| `valor` | string decimal | Sim |
| `codigo_servico` | string | Sim |
| `discriminacao` | string | Sim |
| `aliquota_iss` | number | Não |
| `data_competencia` | ISO date | Não |

## Resposta esperada

```json
{
  "data": {
    "nf_emitir": {
      "id": "nf-123",
      "numero": "410",
      "link_prefeitura": "https://...",
      "status_emissao": "NORMAL"
    }
  }
}
```

## Erros comuns

| Sintoma | Ação |
|---------|------|
| CPF/CNPJ inválido | Revisar cadastro do tomador |
| Código de serviço desconhecido | Ajustar `codigo_servico_padrao` do tomador |
| Empresa não vinculada | Reconectar integração Honest |
| Mutation indisponível | Honest pode não expor `nf_emitir` — usar modo local (`PENDENTE_EMISSAO`) |

## Fallback local

Com `emissao_nf_habilitada = false`, o sistema grava nota com:

- `status_emissao: PENDENTE_EMISSAO`
- `numero: PEND-{timestamp}`
- `origem: emissao_pagamento`

O pagamento é vinculado normalmente via `applyPayment`.
