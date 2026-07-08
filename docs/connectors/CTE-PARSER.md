# Conector CT-e — Especificação técnica

**Fase:** D1 (Document Core · logística)  
**Status:** especificação — implementação pendente  
**Relacionado:** `docs/POSITIONING-DOCUMENT-INTELLIGENCE.md`, `docs/PILOTO-LOGISTICA-DOCUMENTOS.md`

---

## 1. Objetivo

Ler arquivos **XML de CT-e** (Conhecimento de Transporte Eletrônico), produzir um **`DocumentEnvelope` normalizado**, validar campos críticos e alimentar:

- **Finance** — título a receber / conciliação com PIX e extrato
- **Fiscal** — espelho do documento (leitura; emissão é fase D8)
- **Vínculo** — relacionar CT-e com NF-e de carga, MDF-e, comprovantes

**Não é escopo v1:** emitir CT-e na SEFAZ, assinar XML, transmitir lote.

---

## 2. Entrada suportada (v1)

| Formato | Detecção | Notas |
|---------|----------|-------|
| `CTe` autorizado (proc) | root `cteProc` | XML mais comum recebido de terceiros |
| `CTe` resumido | root `CTe` sem `protCTe` | Aceitar com warning |
| ZIP com vários XML | extensão `.zip` | Extrair e processar cada XML |
| Pasta múltipla | upload batch | Mesmo endpoint, N envelopes |

**Layouts alvo v1:** CT-e **3.00** e **4.00** (namespace SEFAZ).

---

## 3. Classificação (antes do parse)

Heurísticas em ordem:

1. `Content-Type: application/xml` ou extensão `.xml`
2. Root element ∈ `{ cteProc, CTe }`
3. Namespace contém `portalfiscal.inf.br/cte` ou infCTe conhecido
4. Presença de tag `infCte` com atributo `Id` começando com `CTe`

Se falhar → `docType: unknown_xml` (não CT-e).

**Confusão com NF-e:** root `nfeProc` / `NFe` → roteador para conector NF-e (spec separado).

---

## 4. Modelo de saída — `DocumentEnvelope` (CT-e)

Extensão do modelo canônico em `POSITIONING-DOCUMENT-INTELLIGENCE.md`:

```ts
type CteDocumentEnvelope = {
  id: string;
  tenantId: string;
  docType: 'cte';
  layoutVersion: '3.00' | '4.00' | 'unknown';

  source: {
    filename: string;
    mime: string;
    contentHash: string; // sha256
    ingestedAt: string;  // ISO
  };

  fiscalKeys: {
    chaveAcesso: string;      // 44 dígitos
    numero: string;           // nCT
    serie: string;
    modelo: string;           // 57
    tpCTe?: string;           // 0 normal, 1 complementar, ...
  };

  parties: {
    emitente: Party;          // transportador
    remetente?: Party;
    destinatario?: Party;
    tomador?: Party;          // toma / toma4
    expedidor?: Party;
    recebedor?: Party;
  };

  amounts: {
    valorPrestacao: number;   // vTPrest / vPrest
    valorReceber: number;     // vRec ou vTRec — base conciliação
    componentes?: Array<{ nome: string; valor: number }>;
    icms?: { cst?: string; vbc?: number; vicms?: number };
  };

  dates: {
    emissao: string;          // dhEmi
    competencia?: string;     // derivado de dhEmi (YYYY-MM)
  };

  route?: {
    municipioInicio?: string;
    ufInicio?: string;
    municipioFim?: string;
    ufFim?: string;
  };

  linkedDocuments?: Array<{
    type: 'nfe' | 'outro';
    chaveAcesso?: string;
  }>;                         // infDoc / chNFe

  validation: {
    ok: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };

  confidence: number;         // 0–1 heurística pós-parse

  rawRef: string;             // storage key do XML original
  links: DocumentLink[];      // preenchido na fase LINK
};

type Party = {
  cnpj?: string;
  cpf?: string;
  ie?: string;
  nome: string;
  municipio?: string;
  uf?: string;
};

type ValidationIssue = {
  code: string;
  field?: string;
  message: string;
  suggestion?: string;
};
```

---

## 5. Mapeamento XML → envelope (referência)

Caminhos XPath-like (implementação pode usar parser XML + namespaces):

| Campo envelope | CT-e 3.00 / 4.00 (infCte) |
|----------------|----------------------------|
| `chaveAcesso` | `@Id` em `infCte` sem prefixo `CTe` |
| `numero` | `ide/nCT` |
| `serie` | `ide/serie` |
| `emissao` | `ide/dhEmi` |
| `emitente` | `emit/*` |
| `remetente` | `rem/*` |
| `destinatario` | `dest/*` |
| `tomador` | `ide/toma3/toma` + rem/dest **ou** `toma4/*` |
| `valorPrestacao` | `vPrest/vTPrest` |
| `valorReceber` | `vPrest/vRec` |
| `chaves NF-e` | `infCTeNorm/infDoc/infNFe/chave` (múltiplas) |
| `município início/fim` | `ide/xMunIni`, `ide/xMunFim` |

**Tomador:** regra de negócio — resolver conforme `ide/toma3/toma` (0=rem, 1=exp, 2=rec, 3=dest, 4=outros).

---

## 6. Validação (v1)

### Erros (bloqueiam `validation.ok`)

| Código | Regra |
|--------|-------|
| `CTE_MISSING_CHAVE` | Chave ausente ou ≠ 44 dígitos |
| `CTE_INVALID_CHAVE_DV` | Dígito verificador da chave inválido |
| `CTE_MISSING_EMITENTE` | CNPJ/CPF ou nome emitente ausente |
| `CTE_MISSING_VALOR` | `valorReceber` ≤ 0 ou NaN |
| `CTE_MISSING_EMISSAO` | Data emissão inválida |
| `CTE_PARSE_ERROR` | XML malformado (não parseável) |

### Warnings (ok com ressalva)

| Código | Regra |
|--------|-------|
| `CTE_NO_PROTOCOLO` | Sem `protCTe` (não autorizado) |
| `CTE_CANCELADO` | `cStat` ou evento cancelamento detectado |
| `CTE_TOMADOR_AMBIGUO` | Tomador não resolvido automaticamente |
| `CTE_DUPLICATE_INGEST` | Mesma chave já ingerida no tenant |

### Corretor (v1.1 — D3)

| Situação | Sugestão automática |
|----------|---------------------|
| Encoding errado (ISO-8859-1) | Re-parse UTF-8 |
| Namespace ausente | Tentar parse local-name |
| Chave com espaços | Trim + revalidar DV |
| Valor com vírgula | Normalizar decimal |

---

## 7. Vínculo com outros documentos (fase D2)

Chaves de matching para `link()`:

| Relação | Chave primária | Chave secundária |
|---------|----------------|------------------|
| CT-e ↔ NF-e carga | `linkedDocuments[].chaveAcesso` | — |
| CT-e ↔ PIX recebido | `valorReceber` + `tomador.cnpj/cpf` | janela ±7 dias em `dhEmi` |
| CT-e ↔ extrato | valor + nome tomador normalizado | `name-match.util` existente |
| CT-e ↔ MDF-e | chaves CT-e listadas no MDF-e | spec MDF-e futura |

**Saída do vínculo:** `links: [{ rel: 'pagamento_de', targetDocumentId, score }]`

Reutilizar `credito-match.util` / `name-match.util` com adaptador `CteMatchCandidate`.

---

## 8. API proposta (Document Core)

Prefixo sugerido: `/api/documents` (evolução de `import-intelligence`).

| Método | Rota | Função |
|--------|------|--------|
| `POST` | `/documents/ingest` | Upload arquivo ou ZIP; classifica + parse |
| `POST` | `/documents/ingest/batch` | Múltiplos arquivos |
| `GET` | `/documents` | Lista envelopes (filtro `docType=cte`) |
| `GET` | `/documents/:id` | Envelope + validação + links |
| `POST` | `/documents/:id/reparse` | Reprocessar após correção manual |
| `POST` | `/documents/link/run` | Executar motor de vínculo no lote |
| `GET` | `/documents/:id/raw` | Download XML original |

**Resposta ingest (exemplo):**

```json
{
  "batch_id": "batch_abc",
  "summary": { "total": 12, "cte_ok": 10, "cte_warning": 1, "failed": 1 },
  "items": [
    {
      "id": "doc_xyz",
      "docType": "cte",
      "fiscalKeys": { "chaveAcesso": "3526...", "numero": "12345" },
      "amounts": { "valorReceber": 1250.0 },
      "validation": { "ok": true, "warnings": [] }
    }
  ]
}
```

---

## 9. Integração com Finance (pós-parse)

Fluxo v1 piloto:

```
CT-e parseado (validation.ok)
    → criar registro financeiro tipo frete_receber
    → campos: chave, tomador, valor, data, emitente
    → status: aguardando_pagamento
    → quando extrato/PIX importado: match automático (score)
    → operador confirma (mesmo UX recebimentos)
```

**Não** reutilizar coleção `notas` diretamente — CT-e não é NFS-e. Opções:

- **A)** Nova coleção `documentos_fiscais` + tipo `cte`
- **B)** Coleção `frete_titulos` até ERP Light existir

Recomendação piloto: **`frete_titulos`** (menor risco ao BDRE de notas).

---

## 10. Estrutura de código (alvo)

```
backend/src/modules/document-core/
  document-core.module.ts
  document-core.controller.ts
  document-core.service.ts
  schemas/document-envelope.schema.ts
  schemas/frete-titulo.schema.ts      # piloto
  classification/
    xml-classifier.ts
  connectors/
    cte/
      cte.connector.ts                # implements DocumentConnector
      cte.parser.ts                   # 3.00 + 4.00
      cte.validator.ts
      cte.chave.util.ts               # DV chave 44
      cte.parser.spec.ts
      fixtures/
        cte-proc-3.00.xml
        cte-proc-4.00.xml
        cte-invalid-dv.xml
  linking/
    cte-payment-linker.ts
```

Interface:

```ts
interface DocumentConnector {
  readonly docTypes: string[];
  classify(filename: string, bytes: Buffer): ClassifyResult | null;
  parse(bytes: Buffer, ctx: ParseContext): Promise<DocumentEnvelope>;
  validate(envelope: DocumentEnvelope): ValidationResult;
}
```

Migração gradual: `import-intelligence` delega CSV/NF JSON ao Core; CT-e entra só no Core.

---

## 11. Fases de implementação

| Fase | Entrega | Gate |
|------|---------|------|
| **D1a** | Classifier + parser 3.00 + testes fixture | 5 XMLs reais parseiam |
| **D1b** | Parser 4.00 + validator chave DV | 95% fixtures CI verdes |
| **D1c** | Ingest endpoint + listagem UI | Piloto usa upload pasta |
| **D2a** | `frete_titulos` + match extrato | 1 cliente fecha dia sem Excel |
| **D2b** | Vínculo CT-e ↔ NF-e chave | Opcional piloto |

---

## 12. Fixtures e testes

- Mínimo **5 XMLs anonimizados** de transportadoras reais (design partner)
- Testes unitários: chave DV, tomador, valores, cancelado
- Testes integração: ingest ZIP 50 arquivos < 30s
- Não commitar XML com CNPJ real — anonimizar no fixture

---

## 13. UI (piloto)

Rota sugerida: `/documentos` ou extensão de `/arquivos/notas`:

1. **Arrastar pasta / ZIP**
2. Tabela: chave, tomador, valor, status validação, vínculo pagamento
3. Detalhe: XML raw + erros + sugestão correção
4. Ação: **Confirmar conciliação** (reusa `movimento-panel` patterns)

---

## 14. Fora de escopo (v1)

- Emissão / cancelamento CT-e SEFAZ
- MDF-e parser (spec `MDFE-PARSER.md` — futuro)
- OCR de CT-e em PDF (imagem)
- Inbox e-mail
- API pública documentada (v1 interna só)

---

## 15. Referências externas

- [Manual CT-e SEFAZ](https://www.cte.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fNBc8dYST3w=) — layouts e XSD
- Chave de acesso: 44 posições (UF, AAMM, CNPJ, modelo 57, série, nCT, código, DV)
- Modelo documento **57** = CT-e

---

## 16. Checklist implementação

- [x] Criar módulo `document-core`
- [x] Schema `DocumentEnvelope` + `frete_titulos`
- [x] `cte.parser.ts` (3.00)
- [x] `cte.chave.util.ts` (DV)
- [x] `cte.validator.ts`
- [x] Fixtures anonimizados
- [x] `POST /documents/ingest`
- [x] UI upload lote
- [x] Integração match Finance (D2)
- [x] Vínculo CT-e ↔ extrato + UI confirmação
- [x] Vínculo CT-e ↔ NF-e chave (D2b)
- [x] Corretor XML básico (D3)
- [x] Parser CT-e 4.00 + fixture
