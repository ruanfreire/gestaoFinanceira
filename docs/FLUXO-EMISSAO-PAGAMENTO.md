# Fluxo de emissão de NF a partir de pagamento

**Status:** planejado — implementação pendente  
**Criado:** 2026-07-03  
**Domínio de referência:** `docs/BDRE.md` (regras existentes **não** são alteradas)  
**Restrição:** fluxo **paralelo** ao atual; zero regressão em importação, conciliação e análises.

---

## 1. Objetivo

Permitir que o operador, a partir de um **pagamento bancário sem nota correspondente**, registre ou emita uma nota fiscal e vincule o recebimento — reutilizando `applyPayment()` e a coleção `notas` existentes.

### Fluxo atual (inalterado)

```
Notas importadas/emitidas fora → Conciliação → applyPayment → Análises / Fluxo de caixa
```

### Fluxo novo (caminho alternativo)

```
Pagamento sem nota → identifica tomador → rascunho de NF → emissão (opcional) → nota gravada → applyPayment
```

O novo fluxo só é acionado quando **não existe nota** para vincular ou quando o operador **escolhe emitir** em vez de buscar nota existente.

---

## 2. Premissas (não negociar)

| Regra | Motivo |
|-------|--------|
| Conciliação atual roda **antes** de qualquer emissão | Não competir com match automático |
| `applyPayment()` é o **único** ponto de vínculo pagamento ↔ nota | Reuso de KPIs, fluxo de caixa, undo |
| Feature flag `emissao_nf_habilitada` por tenant | Rollout gradual; sem flag = zero mudança na UI |
| Novos módulos/coleções; `notas` só ganha campos **opcionais** | Não quebrar importação JSON/Honest |

---

## 3. Onde o fluxo mora na UI

Sem novo item no menu principal na v1.

| Onde | O que adiciona |
|------|----------------|
| **Configurações → Tomadores** | Cadastro de clientes (CPF/CNPJ, e-mail, serviço padrão, aliases) |
| **Confirmar recebimentos** / **Pagamentos sem nota** | Botão secundário: **“Emitir nota para este pagamento”** |
| **Integrações → Honest** | Toggle: “Permitir emissão de NF pelo sistema” (opt-in) |
| **Minhas notas** | Sem mudança — notas do novo fluxo entram na mesma lista |

Menu principal permanece: `Início | Notas | Recebimentos | Trazer dados | Análises`.

---

## 4. Diagrama de estados

```mermaid
flowchart TD
    A[Extrato importado] --> B{Match com nota existente?}
    B -->|Sim| C[Fluxo atual: confirmar vínculo]
    B -->|Não| D[sem_match — fila atual]
    D --> E{Tomador identificado?}
    E -->|Sim, confiança alta| F[Rascunho pré-preenchido]
    E -->|Ambíguo ou novo| G[Operador escolhe/cria tomador]
    G --> F
    F --> H[Revisar: valor, serviço, discriminação]
    H --> I{Honest emissão habilitada?}
    I -->|Sim| J[POST emissão → aguarda retorno]
    I -->|Não| K[Salvar nota local — emissão manual depois]
    J --> L[Grava nota em notas]
    K --> L
    L --> M[applyPayment — mesmo de hoje]
    M --> N[Conciliado — some da fila]
```

---

## 5. Modelo de dados (aditivo)

### 5.1 Nova coleção: `tomadores`

```
tenantId
nome
documento          // CPF ou CNPJ — obrigatório para emissão
email?
endereco: {
  logradouro, numero, bairro, cidade, uf, cep
}
codigo_servico_padrao?
discriminacao_padrao?
aliquota_iss_padrao?
aliases_pagamento: string[]
origem: 'manual' | 'importacao_nf' | 'sugestao'
ativo: boolean      // default true (soft delete)
```

### 5.2 Nova coleção: `emissao_rascunhos` (fase 3+)

```
tenantId
lancamento_id
tomador_id
payload: {
  valor, codigo_servico, discriminacao, aliquota_iss, data_competencia
}
status: 'rascunho' | 'confirmado' | 'emitindo' | 'emitida' | 'erro'
nota_id?
erro_mensagem?
createdBy
```

### 5.3 Campos opcionais em `notas` (fase 3+)

```
origem?: 'importacao' | 'manual' | 'emissao_pagamento'   // implícito para registros legados
tomador_id?: ObjectId
```

Campos de pagamento (`status_pagamento`, `pagamentos[]`) **não mudam**.

### 5.4 Feature flag

Em `honest-integration.schema.ts` ou perfil da org:

```
emissao_nf_habilitada: boolean   // default: false
emissao_verified_at?: Date
emissao_verify_error?: string
```

---

## 6. APIs novas

### Tomadores (`/tomadores`)

| Método | Rota | Função |
|--------|------|--------|
| `GET` | `/tomadores` | Listagem paginada + busca (`q`) |
| `GET` | `/tomadores/:id` | Detalhe |
| `POST` | `/tomadores` | Criar |
| `PATCH` | `/tomadores/:id` | Atualizar |
| `DELETE` | `/tomadores/:id` | Soft delete (`ativo: false`) |
| `POST` | `/tomadores/importar-de-notas` | Extrai tomadores únicos das NFs existentes |
| `POST` | `/tomadores/resolver` | Body: `{ pagador_nome, valor?, data? }` → candidatos com score |

### Emissão (`/emissao`) — fase 3+

| Método | Rota | Função |
|--------|------|--------|
| `POST` | `/emissao/rascunhos` | Cria rascunho a partir de `lancamento_id` + `tomador_id` |
| `GET` | `/emissao/rascunhos/:id` | Detalhe |
| `PATCH` | `/emissao/rascunhos/:id` | Edita payload antes de confirmar |
| `POST` | `/emissao/rascunhos/:id/confirmar` | Grava nota + vincula pagamento |

### Enriquecimento da fila de recebimentos (fase 2)

- Payload do lançamento ganha campo opcional:
  ```ts
  tomador_sugerido?: { id: string; nome: string; score: number }
  ```
- Lógica de `resolveCreditoMatch` **não é alterada**.

---

## 7. Estrutura de arquivos prevista

### Backend

```
backend/src/modules/tomadores/
  tomadores.module.ts
  tomadores.controller.ts
  tomadores.service.ts
  schemas/tomador.schema.ts
  dto/create-tomador.dto.ts
  dto/update-tomador.dto.ts
  tomador-match.util.ts
  tomador-match.util.spec.ts

backend/src/modules/emissao/          # fase 3+
  emissao.module.ts
  emissao.controller.ts
  emissao.service.ts
  schemas/emissao-rascunho.schema.ts
  dto/criar-rascunho.dto.ts
  dto/confirmar-rascunho.dto.ts
```

Registrar `TomadoresModule` e `EmissaoModule` em `app.module.ts`.

### Frontend

```
frontend/src/features/tomadores/
  api.ts, types.ts, hooks.ts
  pages/tomadores-page.tsx
  components/tomador-form.tsx
  components/tomador-list.tsx

frontend/src/features/emissao/        # fase 3+
  api.ts, types.ts, hooks.ts
  components/emissao-wizard.tsx
  pages/emitir-nota-page.tsx          # ou Sheet em recebimentos
```

**Rotas:**

- `ROUTES.tomadores = "/configuracoes/tomadores"`
- Card em `configuracoes-page.tsx`
- Botão em `movimento-panel.tsx` (fase 3+)

---

## 8. Fases de implementação

### Fase 0 — Alinhamento e documentação (1–2 dias)

- [ ] **0.1** Este documento revisado e aprovado
- [ ] **0.2** Feature flag `emissao_nf_habilitada` no schema (default `false`)
- [ ] **0.3** Helper `isEmissaoNfEnabled(tenantId)` no backend
- [ ] **0.4** Critérios de aceite globais validados:
  - [ ] Importação JSON inalterada
  - [ ] `vincularManual` / conciliação auto inalterados
  - [ ] Com flag desligada, UI de recebimentos idêntica

**Entrega:** flag no schema; sem mudança de comportamento.

---

### Fase 1 — Cadastro de Tomadores (3–5 dias)

- [ ] **1.1** Módulo `tomadores` (schema, service, controller)
- [ ] **1.2** `POST /tomadores/importar-de-notas` — agrupa por `tomador_documento` ou nome normalizado
- [ ] **1.3** `POST /tomadores/resolver` — reutiliza `name-match.util.ts` + aliases
- [ ] **1.4** Registrar `TomadoresModule` em `app.module.ts`
- [ ] **1.5** Frontend: `/configuracoes/tomadores` (CRUD)
- [ ] **1.6** Card em `configuracoes-page.tsx`
- [ ] **1.7** Testes: `tomador-match.util.spec.ts` + CRUD integração

**Entrega:** cadastro funcional; zero impacto em recebimentos.

**Gate:** operador cadastra tomador com CPF/CNPJ e serviço padrão.

---

### Fase 2 — Sugestão de tomador em Recebimentos (2–3 dias)

- [ ] **2.1** Enriquecer API de recebimentos com `tomador_sugerido` para `sem_match` e `pendente_vinculo`
- [ ] **2.2** Callout em `movimento-panel.tsx`: “Cliente provável: **X** (N%)”
- [ ] **2.3** Link “Ver cadastro” → `/configuracoes/tomadores/:id`
- [ ] **2.4** Mesmo enriquecimento em `/recebimentos/sem-correspondencia`

**Entrega:** contexto para o operador; vínculo manual intacto.

**Gate:** badge de confiança visível; conciliação manual funciona igual.

---

### Fase 3 — Rascunho local + nota + vínculo (4–6 dias)

*Sem API de emissão — valida fluxo ponta a ponta.*

- [ ] **3.1** Módulo `emissao` + schema `emissao_rascunhos`
- [ ] **3.2** Endpoints de rascunho (criar, editar, confirmar)
- [ ] **3.3** Campos opcionais `origem` e `tomador_id` em `nota.schema.ts`
- [ ] **3.4** `confirmar` sem Honest:
  1. Validar lançamento em `sem_match` ou `pendente_vinculo`
  2. Validar tomador com documento
  3. `notasService.create()` com `origem: 'emissao_pagamento'`, `status_emissao: 'PENDENTE_EMISSAO'`
  4. `applyPayment` + lançamento → `conciliado_manual`
- [ ] **3.5** Idempotência: bloquear se `lancamento.nota_id` já existe
- [ ] **3.6** Frontend: wizard 3 passos (Tomador → Dados fiscais → Confirmar)
- [ ] **3.7** Botão em `movimento-panel.tsx`: “Registrar nota para este recebimento”
- [ ] **3.8** Testes integração: `sem_match` → rascunho → confirmar → nota `pago`

**Entrega:** fluxo completo sem prefeitura.

**Gate:** KPIs e fluxo de caixa refletem a nota; undo de conciliação funciona.

---

### Fase 4 — Emissão real via Honest (5–8 dias)

*Só tenants com `emissao_nf_habilitada` + Honest conectada.*

- [ ] **4.1** Documentar mutation de emissão em `docs/HONEST-EMISSAO-API.md`
- [ ] **4.2** `honest-api.client.ts`: `emitirNf(session, payload)`
- [ ] **4.3** `confirmar` com emissão:
  1. Status `emitindo`
  2. Chamar Honest
  3. Sucesso: nota com `numero`, `link_prefeitura`, `nota_api_id`, `status_emissao: 'NORMAL'`
  4. Erro: status `erro`; lançamento permanece `sem_match`
- [ ] **4.4** Toggle na `honest-integration-page.tsx`
- [ ] **4.5** Mapeamento de erros fiscais (documento inválido, serviço, CCM)
- [ ] **4.6** Testes com mock da API Honest

**Entrega:** emissão fiscal real, opt-in.

**Gate:** nota com link prefeitura; pagamento vinculado.

---

### Fase 5 — Polish, observabilidade e rollout (2–3 dias)

- [ ] **5.1** Notificação: “NF emitida para [tomador] — R$ X”
- [ ] **5.2** Alerta no Início: “N pagamentos aguardam emissão de NF” (contador separado da conciliação)
- [ ] **5.3** Audit logs: `emissao_nf_criada`, `emissao_nf_confirmada`, `emissao_nf_erro`
- [ ] **5.4** `plan-limits.service`: contar notas `emissao_pagamento` no limite mensal (se aplicável)
- [ ] **5.5** Rollout: tenant piloto → monitorar 1 semana → demais tenants
- [ ] **5.6** Atualizar `RELEASE-CHECKLIST.md` e `PRODUCT-SPEC.md` (Módulo 8 estendido)

---

## 9. Cronograma estimado

| Fase | Duração | Risco p/ existente | Valor entregue |
|------|---------|-------------------|----------------|
| 0 — Doc + flag | 1–2 dias | Nenhum | Alinhamento |
| 1 — Tomadores | 3–5 dias | Nenhum | Cadastro de clientes |
| 2 — Sugestão | 2–3 dias | Baixo | Contexto em recebimentos |
| 3 — Rascunho local | 4–6 dias | Baixo | Fluxo ponta a ponta sem prefeitura |
| 4 — Honest emissão | 5–8 dias | Médio (opt-in) | Emissão fiscal real |
| 5 — Polish | 2–3 dias | Baixo | Produção segura |

**Total:** 17–27 dias úteis (1 dev full-stack).

---

## 10. Checklist executável (ordem)

```
[x] 0.1  Revisar este documento
[x] 0.2  Feature flag no schema org/honest
[x] 0.3  isEmissaoNfEnabled(tenantId)
[x] 1.1  Módulo tomadores (backend)
[x] 1.2  POST /tomadores/importar-de-notas
[x] 1.3  POST /tomadores/resolver
[x] 1.4  TomadoresModule em app.module.ts
[x] 1.5  UI /configuracoes/tomadores
[x] 1.6  Card em configuracoes-page.tsx
[ ] 2.1  tomador_sugerido na API de recebimentos
[ ] 2.2  Callout no movimento-panel
[ ] 3.1  Módulo emissao + schema rascunho
[ ] 3.2  POST/PATCH/confirmar rascunho
[ ] 3.3  origem + tomador_id em nota.schema
[ ] 3.4  Wizard “Registrar nota para este recebimento”
[ ] 4.1  docs/HONEST-EMISSAO-API.md
[ ] 4.2  honest-api.client emitirNf
[ ] 4.3  confirmar com emissão real
[ ] 4.4  Toggle na página Honest
[ ] 5.x  Alertas, audit, notificações
```

---

## 11. UX Writing

**Pagamentos sem nota (fase 3+):**

> **Registrar nota para este recebimento**  
> Use quando o cliente pagou mas a nota ainda não foi emitida.

**Wizard de emissão (fase 4):**

> Revise os dados fiscais antes de enviar à prefeitura. O pagamento será vinculado automaticamente após a emissão.

**Tomadores (configurações):**

> Cadastre os clientes que recebem notas fiscais. Os nomes que aparecem no extrato bancário podem ser adicionados como apelidos para facilitar a identificação.

---

## 12. O que NÃO fazer neste plano

- Não alterar `resolveCreditoMatch` nem thresholds de match
- Não mudar importação JSON / sync Honest (`NfsEmitidas`)
- Não criar menu principal novo na v1
- Não emitir automaticamente sem confirmação humana na v1
- Não alterar regras documentadas em `docs/BDRE.md`

---

## 13. Dependências entre fases

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5
              │                      │
              └──────────────────────┘
              (Fase 2 pode iniciar após 1.3)
```

Fase 3 depende de Fase 1 (tomadores). Fase 4 depende de Fase 3 + integração Honest ativa.

---

## 14. Referências

| Documento | Relação |
|-----------|---------|
| `docs/BDRE.md` | Domínio atual (importação × conciliação) |
| `docs/PRODUCT-SPEC.md` | Módulo 8 — Confirmar recebimentos |
| `docs/ROADMAP-SAAS.md` | Pós-roadmap — emissão por pagamento |
| `backend/src/modules/notas/notas.service.ts` | `applyPayment`, `create`, `importBulk` |
| `backend/src/modules/conciliacao/credito-match.util.ts` | Match automático (não alterar) |
| `backend/src/modules/integrations/honest-integration.service.ts` | Sync `NfsEmitidas` (leitura) |
