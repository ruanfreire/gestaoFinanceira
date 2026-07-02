# Gestão Financeira — Rebuild Frontend (Greenfield)

> **Status:** Fase de planejamento — aguardando validação antes da implementação  
> **Data:** 2026-07-01  
> **Escopo:** Descartar 100% do frontend atual (incluindo `/UI`). Preservar apenas regras de negócio, APIs e contratos do backend.

---

## Índice

1. [Regras de negócio documentadas](#1-regras-de-negócio-documentadas)
2. [Arquitetura da informação (nova)](#2-arquitetura-da-informação-nova)
3. [Personas e Jobs To Be Done](#3-personas-e-jobs-to-be-done)
4. [Jornadas do usuário](#4-jornadas-do-usuário)
5. [Wireframes de baixa fidelidade](#5-wireframes-de-baixa-fidelidade)
6. [Design System](#6-design-system)
7. [Inventário de componentes](#7-inventário-de-componentes)
8. [Arquitetura do frontend](#8-arquitetura-do-frontend)
9. [Protótipos de alta fidelidade](#9-protótipos-de-alta-fidelidade)
10. [Fases de implementação](#10-fases-de-implementação)
11. [Checklist de validação](#11-checklist-de-validação)

---

## 1. Regras de negócio documentadas

### 1.1 Domínios do sistema

| Domínio | O que o usuário faz | Backend |
|---------|---------------------|---------|
| **Autenticação** | Entrar, sair, manter sessão | `/api/auth/*` |
| **Notas fiscais** | Ver, buscar, registrar manualmente, ver pagamentos, desvincular | `/api/notas/*` |
| **Importar notas** | Enviar JSON de NF, ver histórico, reprocessar, excluir | `/api/importacoes/*` |
| **Importar extratos** | Enviar CSV Asaas/Nubank, ver histórico, excluir | `/api/extrato-*/upload`, `/api/importacoes-bancarias/*` |
| **Conciliação** | Vincular pagamentos bancários às notas, corrigir sem match | `/api/extrato-*/pendentes`, `sem-match`, `vincular` |
| **Relatórios** | Ver extração de notas, exportar CSV/XLSX fluxo de caixa | `/api/notas/extracao`, `/api/relatorios/*` |

### 1.2 Autenticação (contrato imutável)

```
POST /api/auth/login     → { email, password } → { ok, accessToken, user } + cookie refreshToken
POST /api/auth/refresh   → cookie → { ok, accessToken }
POST /api/auth/logout    → revoga sessão
```

- Access token: `Authorization: Bearer <token>` (localStorage `accessToken`)
- Refresh: httpOnly cookie, rotação automática
- Credencial seed: `admin@finance.local` / `123456`
- Em 401: tentar refresh uma vez; falha → limpar sessão → `/auth/signin`
- Lembrar e-mail: apenas localStorage (`finance.rememberEmail`), sem enviar ao backend

### 1.3 Notas fiscais

**Campos principais:** `empresa`, `numero`, `tomador`, `valor`, `data_emissao`, `mes_competencia`, `status_pagamento`, `valor_pago`, `pagamentos[]`

**Status de pagamento:** `em_aberto` (padrão) | `parcial` | `pago`

**Regras:**
- Upsert por `nota_api_id` ou `empresa` + `numero`
- Reimportação de JSON **não** sobrescreve estado de pagamento/conciliação
- Registro manual exige: `empresa`, `numero`, `data_emissao`, `valor` > 0
- Valor em formato BR: remover `.`, trocar `,` por `.`
- Payload manual: `status: "emitida"`, `data_emissao` ISO
- Desvincular pagamento: só se lançamento `conciliado_auto` ou `conciliado_manual`; reverte nota e retorna lançamento a `pendente_vinculo`

### 1.4 Importação JSON (notas)

**Estrutura esperada:** `data[].empresa[].nf_lista[].items[]`

**Fluxo backend:**
1. Upload multipart `file` (JSON, máx 5MB)
2. Parse → mapear itens → upsert em lote
3. Retorno: `{ ok, id, imported, updated, ignored, total_faturas, processingTimeMs }`

**Status importação:** `pending` | `processing` | `finished` | `failed`

**Regras frontend (validação pré-upload):**
- Arquivo deve ser JSON válido
- Estrutura reconhecida (nested empresas/nf_lista/items)
- Bloquear upload se preview inválido
- Reprocessar exige `originalJson` armazenado
- Excluir remove apenas registro de importação (notas permanecem)

### 1.5 Importação CSV (extratos)

**Bancos:** `asaas` | `nubank`

**Upload:** `POST /api/extrato-asaas/upload` ou `/api/extrato-nubank/upload`

**Retorno inclui:** `importacao_id`, contadores (`conciliado_auto`, `pendente_vinculo`, `sem_match`, etc.)

**Regras:**
- `transacao_id` único por banco — duplicatas ignoradas no re-upload
- Exclusão bloqueada se existir lançamento `conciliado_auto` ou `conciliado_manual`
- Nubank: formato auto-detectado (`conta` | `cartao`)
- Preview CSV: arquivo não vazio, headers parseáveis

### 1.6 Conciliação

**Status `status_conciliacao`:**

| Valor | Significado para o usuário |
|-------|---------------------------|
| `extrato` | Movimento bancário (não é recebimento) |
| `conciliado_auto` | Sistema vinculou automaticamente |
| `pendente_vinculo` | Há candidatas — usuário deve escolher |
| `conciliado_manual` | Usuário vinculou manualmente |
| `sem_match` | Nenhuma nota compatível encontrada |

**Algoritmo de match (exibir ao usuário):**
- Nome do pagador (peso 50%)
- Valor exato (+35%) ou parcial (+28%)
- Proximidade de data (+15%)
- Competência (+12% ou +6%)
- Auto-match: nome ≥ 0.8 + valor + (competência OU data ≤ 45 dias)
- Tolerância monetária: ±R$ 0,01

**Regras Asaas vs Nubank:**

| | Asaas | Nubank |
|---|-------|--------|
| Conciliável | Só "Cobrança recebida" + crédito | Todo crédito |
| Sem nome pagador | `sem_match` imediato | Match por valor + data |
| Correção pagador | — | `POST .../lancamentos/:id/pagador` |

**Vínculo manual:** apenas `pendente_vinculo` ou `sem_match`

**Merge client-side:** listas Asaas + Nubank com tag `source`; chave `"{source}-{lancamento._id}"`

### 1.7 Relatórios

**Extração de notas** (`GET /api/notas/extracao`):
- Período: `mes_pagamento` OU `from`+`to`
- Filtro opcional: `status_pagamento`, `date_basis` (`pagamento` | `emissao`)
- Retorno: `items`, `total`, `totais: { valor_nf, valor_pago, saldo_aberto }`
- Export CSV: 25 colunas, UTF-8 BOM

**Fluxo de caixa** (`GET /api/relatorios/exportacao-fluxo-caixa`):
- `banco`: `consolidado` | `nubank` | `asaas`
- Período: `mes_pagamento`/`mes_competencia` OU `from`+`to`
- Consolidado: não envia overrides de cabeçalho
- Por banco: opcional `empresa_nome`, `empresa_cnpj`, `conta_corrente`, `saldo_inicial`
- Retorno: Excel `.xlsx`

### 1.8 Dashboard (lógica client-side a preservar)

Agregação de múltiplas APIs:
- Extração notas (fallback: `date_basis=pagamento` → se vazio, `emissao`)
- Pendentes + sem-match (Asaas + Nubank)
- Importações recentes (faturas + extratos, top 8)
- KPI "pago": `status_pagamento === "pago"` OU `saldo_aberto <= 0`
- Alertas: sem-match > 0, pendentes > 0, saldo aberto > 0, importações falhas

### 1.9 Invalidação de cache (React Query)

Conciliação/desvincular/importar deve invalidar:
- `conciliacao`, `dashboard`, `notas`, `importacoes-extratos`, `importacoes-faturas`

---

## 2. Arquitetura da informação (nova)

### Princípio: jornada do usuário, não estrutura do banco

O usuário pensa em **tarefas**, não em "módulos". A navegação segue o ciclo operacional:

```
Entrar → Ver o que importa → Agir → Confirmar → Próximo passo
```

### Nova estrutura de navegação

```
┌─────────────────────────────────────────────────────────────┐
│  INÍCIO          O que precisa da minha atenção hoje?       │
├─────────────────────────────────────────────────────────────┤
│  NOTAS           Minhas notas · Registrar nota              │
├─────────────────────────────────────────────────────────────┤
│  RECEBIMENTOS    Cruzar com o banco · Sem correspondência   │
├─────────────────────────────────────────────────────────────┤
│  ARQUIVOS        Trazer notas (JSON) · Trazer extrato (CSV) │
│                  Histórico de importações                   │
├─────────────────────────────────────────────────────────────┤
│  ANÁLISES        Situação das notas · Fluxo de caixa        │
└─────────────────────────────────────────────────────────────┘
```

### Mapa de rotas (nova)

| Rota | Nome amigável | Função |
|------|---------------|--------|
| `/auth/entrar` | Entrar | Login |
| `/` | Início | Central operacional |
| `/notas` | Minhas notas | Lista + busca |
| `/notas/nova` | Registrar nota | Formulário manual |
| `/recebimentos` | Cruzar pagamentos | Fila pendente (default) |
| `/recebimentos/sem-correspondencia` | Sem correspondência | Fila sem match |
| `/arquivos/notas` | Trazer notas | Wizard JSON |
| `/arquivos/extratos` | Trazer extrato | Wizard CSV |
| `/arquivos/historico` | Histórico | Tabs: notas / extratos |
| `/arquivos/historico/notas/:id` | Detalhe importação NF | |
| `/arquivos/historico/extratos/:banco/:id` | Detalhe importação extrato | |
| `/analises/situacao` | Situação das notas | Preview + export CSV |
| `/analises/fluxo-caixa` | Fluxo de caixa | Preview + export XLSX |

### Navegação por dispositivo

| Desktop | Mobile |
|---------|--------|
| Sidebar fixa (5 grupos) | Bottom nav (4 ícones: Início, Notas, Recebimentos, Mais) |
| Command palette (⌘K) | FAB contextual na tela ativa |
| Painel direito para detalhes | Bottom sheet para detalhes/ações |

### Glossário (linguagem do usuário)

| Evitar | Usar |
|--------|------|
| Conciliação | Cruzar pagamentos |
| Sem match | Sem correspondência |
| Lançamento | Movimento do banco |
| Extração | Situação das notas |
| Importação | Trazer arquivo / Enviar arquivo |
| Vincular | Confirmar correspondência |
| Desvincular | Desfazer correspondência |
| Status conciliado_auto | Correspondência automática |
| pendente_vinculo | Aguardando sua escolha |

---

## 3. Personas e Jobs To Be Done

### Persona 1 — Ana, Assistente Administrativa

- **Perfil:** 32 anos, sem formação financeira, usa o sistema diariamente
- **Objetivo:** Manter notas e pagamentos organizados sem depender de planilhas
- **Dores:** Termos técnicos, medo de errar importação, não sabe o que fazer depois de importar
- **JTBD:** "Quando recebo o arquivo do contador/banco, quero enviar e saber se deu certo, para não perder tempo conferindo linha a linha"

### Persona 2 — Carlos, Sócio/Gestor

- **Perfil:** 45 anos, olha o sistema 2–3x/semana
- **Objetivo:** Saber se o caixa está saudável e o que está pendente
- **Dores:** Dashboard com números sem contexto, não sabe por onde começar
- **JTBD:** "Quando abro o sistema, quero ver imediatamente o que precisa da minha atenção, para decidir em 30 segundos"

### Persona 3 — Marina, Contadora Externa

- **Perfil:** 38 anos, técnica, usa para exportar relatórios
- **Objetivo:** Gerar fluxo de caixa e extração para entrega ao cliente
- **Dores:** Exportar sem ver preview, filtros confusos
- **JTBD:** "Quando preciso do relatório mensal, quero filtrar, ver o resumo e só então exportar"

### Tarefas principais (prioridade)

| # | Tarefa | Frequência | Persona |
|---|--------|------------|---------|
| 1 | Ver o que está pendente | Diária | Carlos, Ana |
| 2 | Importar arquivo de notas | Semanal | Ana |
| 3 | Importar extrato bancário | Semanal | Ana |
| 4 | Cruzar pagamento com nota | Diária | Ana |
| 5 | Registrar nota manual | Ocasional | Ana |
| 6 | Exportar relatório | Mensal | Marina |
| 7 | Desfazer correspondência errada | Ocasional | Ana |

---

## 4. Jornadas do usuário

### Jornada A — Primeiro uso do dia (Carlos)

```
Abrir app → Início
  ├─ Banner: "3 pagamentos aguardam confirmação"
  ├─ Card: "R$ 12.400 em aberto este mês"
  └─ CTA primário: "Ver pagamentos pendentes"
       → Recebimentos (fila)
            → Escolher nota sugerida → Confirmar
                 → Toast: "Correspondência confirmada" + "Próximo: 2 restantes"
```

### Jornada B — Importar notas (Ana)

```
Arquivos → Trazer notas
  Step 1: Arrastar JSON
  Step 2: Pré-visualizar (X notas, Y empresas) ✓ ou ✗ problemas
  Step 3: Confirmar envio
  Step 4: Resultado (importadas/atualizadas/ignoradas)
  Step 5: "Próximo passo" → Trazer extrato do banco
```

### Jornada C — Cruzar pagamento sem nome (Nubank PIX)

```
Recebimentos → Sem correspondência
  → Card: "Pix R$ 500 — pagador não identificado"
  → Campo: "Quem pagou?" + Sugestões
  → Lista de notas compatíveis com score explicado
  → Confirmar → Desfazer disponível
```

### Jornada D — Relatório mensal (Marina)

```
Análises → Situação das notas
  → Escolher mês → Aplicar
  → Resumo: total NF, pago, em aberto
  → Gráfico + tabela filtrável
  → Exportar CSV (só após preview)
```

---

## 5. Wireframes de baixa fidelidade

### 5.1 Entrar (`/auth/entrar`)

```
┌────────────────────────────────────────┐
│                                        │
│         [logo] Gestão Financeira       │
│                                        │
│   ┌──────────────────────────────┐   │
│   │  Entrar na sua conta           │   │
│   │                                │   │
│   │  E-mail                        │   │
│   │  [________________________]    │   │
│   │                                │   │
│   │  Senha                         │   │
│   │  [________________________] 👁  │   │
│   │                                │   │
│   │  ☐ Lembrar e-mail              │   │
│   │                                │   │
│   │  [      Entrar      ]          │   │
│   │                                │   │
│   │  Precisa de ajuda? Fale com    │   │
│   │  o administrador.              │   │
│   └──────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### 5.2 Início — Central operacional (`/`)

```
┌──────────┬──────────────────────────────────────────────────────┐
│ INÍCIO ● │  Bom dia, Ana                    [🔔 3] [avatar ▾]  │
│ Notas    ├──────────────────────────────────────────────────────┤
│ Receb.   │  ┌─ Precisa da sua atenção ──────────────────────┐  │
│ Arquivos │  │ ⚠ 3 pagamentos aguardam confirmação    [Ver →]│  │
│ Análises │  │ ⚠ 2 sem correspondência              [Ver →]│  │
│          │  │ ℹ R$ 12.400 em aberto neste mês               │  │
│          │  └───────────────────────────────────────────────┘  │
│          │                                                      │
│          │  Ações rápidas                                       │
│          │  [Trazer notas] [Trazer extrato] [Cruzar pagamentos] │
│          │                                                      │
│          │  ┌─ Resumo do período ──── [Jul 2026 ▾] ─────────┐  │
│          │  │ Emitido    Recebido    Em aberto              │  │
│          │  │ R$ 45k     R$ 32k       R$ 13k                │  │
│          │  │ [═══════════ gráfico mensal ═════════════]    │  │
│          │  └───────────────────────────────────────────────┘  │
│          │                                                      │
│          │  Atividade recente                                   │
│          │  • Extrato Nubank importado há 2h                    │
│          │  • 15 notas importadas ontem                         │
└──────────┴──────────────────────────────────────────────────────┘
```

### 5.3 Minhas notas (`/notas`)

```
┌──────────┬──────────────────────────────────────────────────────┐
│          │  Minhas notas                    [+ Registrar nota]  │
│          ├──────────────────────────────────────────────────────┤
│          │  🔍 Buscar por número, tomador...                    │
│          │                                                      │
│          │  ┌────────────────────────────────────────────────┐  │
│          │  │ NF 1234 · Empresa X · R$ 1.200    [Em aberto] │  │
│          │  │ Tomador: João · Emissão: 15/06                │  │
│          │  └────────────────────────────────────────────────┘  │
│          │  ┌────────────────────────────────────────────────┐  │
│          │  │ NF 1235 · ...                      [Pago ✓]   │  │
│          │  └────────────────────────────────────────────────┘  │
│          │                                                      │
│          │  [← 1 2 3 →]                                         │
└──────────┴──────────────────────────────────────────────────────┘

Mobile: cards empilhados; toque abre bottom sheet com pagamentos + desvincular
```

### 5.4 Cruzar pagamentos (`/recebimentos`)

```
┌──────────┬──────────────────────────────────────────────────────┐
│          │  Cruzar pagamentos                                   │
│          │  [Aguardando escolha (3)] [Sem correspondência (2)]  │
│          ├──────────────────────────────────────────────────────┤
│          │                                                      │
│          │  ┌─ Movimento ──────────────────────────────────┐  │
│          │  │ Asaas · Cobrança recebida · R$ 1.200         │  │
│          │  │ 20/06/2026 · Pagador: Maria Silva            │  │
│          │  │                                              │  │
│          │  │ Sugestão: NF 1234 — Maria Silva · R$ 1.200   │  │
│          │  │ Por quê? Nome 95% · Valor exato · Data 3d    │  │
│          │  │                                              │  │
│          │  │ Ou escolha outra nota: [buscar...        ▾]   │  │
│          │  │                                              │  │
│          │  │ [Confirmar correspondência]  [Pular]         │  │
│          │  └──────────────────────────────────────────────┘  │
│          │                                                      │
│          │  Atalhos: j/k navegar · Ctrl+Enter confirmar       │
└──────────┴──────────────────────────────────────────────────────┘
```

### 5.5 Trazer notas — Wizard (`/arquivos/notas`)

```
Step indicator: ① Arquivo → ② Conferir → ③ Enviar → ④ Resultado

Step 2 — Conferir:
┌──────────────────────────────────────────────────────────────┐
│  Conferir antes de enviar                                    │
│                                                              │
│  ✓ Arquivo válido                                            │
│  2 empresas · 47 notas encontradas                           │
│                                                              │
│  Amostra:                                                    │
│  │ NF    │ Tomador      │ Valor    │ Emissão   │            │
│  │ 1234  │ João         │ R$ 500   │ 15/06     │            │
│  │ 1235  │ Maria        │ R$ 1.200 │ 16/06     │            │
│                                                              │
│  [← Voltar]                              [Enviar arquivo →]  │
└──────────────────────────────────────────────────────────────┘

Step 4 — Resultado:
┌──────────────────────────────────────────────────────────────┐
│  ✓ Importação concluída                                      │
│  40 novas · 5 atualizadas · 2 ignoradas                      │
│                                                              │
│  Próximo passo recomendado:                                  │
│  [Trazer extrato do banco →]                                 │
└──────────────────────────────────────────────────────────────┘
```

### 5.6 Trazer extrato — Wizard (`/arquivos/extratos`)

```
Step 1:
┌──────────────────────────────────────────────────────────────┐
│  De qual banco é o extrato?                                  │
│  ┌─────────────┐  ┌─────────────┐                            │
│  │   Asaas     │  │   Nubank    │                            │
│  └─────────────┘  └─────────────┘                            │
│                                                              │
│  Arraste o arquivo CSV ou [escolher arquivo]                 │
└──────────────────────────────────────────────────────────────┘
```

### 5.7 Situação das notas (`/analises/situacao`)

```
┌──────────┬──────────────────────────────────────────────────────┐
│          │  Situação das notas                                  │
│          ├──────────────────────────────────────────────────────┤
│          │  Período: (•) Mês [Jul/2026]  ( ) Intervalo         │
│          │  Status: [Todos ▾]   Base: [Pagamento ▾]            │
│          │  [Aplicar filtros]                                   │
│          │                                                      │
│          │  ┌─ Resumo ─────────────────────────────────────┐  │
│          │  │ Total NF: R$ 45k │ Pago: R$ 32k │ Aberto: R$13k│  │
│          │  └───────────────────────────────────────────────┘  │
│          │  [gráfico pizza: pago/parcial/aberto]               │
│          │  [tabela com notas filtradas]                       │
│          │                                                      │
│          │  [Exportar CSV]  (habilitado após aplicar filtros)  │
└──────────┴──────────────────────────────────────────────────────┘
```

### 5.8 Fluxo de caixa (`/analises/fluxo-caixa`)

```
Wizard: ① Período → ② Banco → ③ Conferir → ④ Exportar

Step 3 — Conferir:
┌──────────────────────────────────────────────────────────────┐
│  Conferir exportação                                         │
│  Banco: Consolidado · Período: Jul/2026                      │
│  (campos empresa/conta só se banco específico)               │
│                                                              │
│  O arquivo incluirá movimentos conciliados do período.       │
│                                                              │
│  [← Voltar]                         [Baixar Excel →]         │
└──────────────────────────────────────────────────────────────┘
```

### 5.9 Mobile — Bottom navigation

```
┌────────────────────────────────────┐
│  [conteúdo da tela]                │
│                                    │
│                                    │
├────────────────────────────────────┤
│  🏠 Início  📄 Notas  🔗 Receb.  ≡ │
└────────────────────────────────────┘
```

---

## 6. Design System

### 6.1 Fundação

| Token | Valor | Uso |
|-------|-------|-----|
| **Fonte** | Inter (fallback: system-ui) | Legibilidade, WCAG |
| **Escala tipo** | 12 / 14 / 16 / 20 / 24 / 32 | Corpo / labels / títulos |
| **Grid** | 4px base, 8px rhythm | Espaçamento consistente |
| **Raio** | 8px (input), 12px (card), 16px (modal) | Hierarquia |
| **Sombra** | sm apenas em cards/modais | Lei de Prägnanz |

### 6.2 Cores (WCAG AA)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--primary` | #2563EB | #3B82F6 | Ações primárias |
| `--primary-foreground` | #FFFFFF | #FFFFFF | Texto em botão |
| `--background` | #FAFAFA | #0A0A0A | Fundo app |
| `--card` | #FFFFFF | #171717 | Superfícies |
| `--muted` | #F4F4F5 | #262626 | Fundos secundários |
| `--muted-foreground` | #71717A | #A1A1AA | Texto secundário |
| `--destructive` | #DC2626 | #EF4444 | Erros, desfazer |
| `--success` | #16A34A | #22C55E | Concluído, pago |
| `--warning` | #D97706 | #F59E0B | Atenção, pendente |
| `--border` | #E4E4E7 | #27272A | Divisores |

**Status semânticos:**

| Status | Cor | Ícone |
|--------|-----|-------|
| Em aberto | warning | clock |
| Parcial | warning | pie-chart |
| Pago | success | check-circle |
| Aguardando escolha | primary | link |
| Sem correspondência | destructive | help-circle |
| Correspondência automática | success | zap |

### 6.3 Espaçamento e layout

- **Desktop:** sidebar 240px, conteúdo max-width 1280px, padding 24–32px
- **Tablet:** sidebar colapsável (ícones), padding 16px
- **Mobile:** full-width, padding 16px, bottom nav 64px + safe-area

### 6.4 Motion (Framer Motion)

- Transições de página: fade + slide 150ms
- Cards entrando: stagger 50ms
- Modais/sheets: spring damping 25, stiffness 300
- **Proibido:** animações decorativas, loops, parallax

### 6.5 Acessibilidade

- Contraste mínimo 4.5:1 (texto), 3:1 (UI grande)
- Focus ring visível: `ring-2 ring-primary ring-offset-2`
- Áreas clicáveis mínimo 44×44px (mobile)
- `aria-live` para toasts e resultados de importação
- Labels em todos os inputs; `aria-describedby` para ajuda contextual

---

## 7. Inventário de componentes

### 7.1 Primitivos (shadcn/ui)

`Button`, `Input`, `Label`, `Checkbox`, `Select`, `Textarea`, `Badge`, `Card`, `Dialog`, `Sheet`, `DropdownMenu`, `Tabs`, `Tooltip`, `Popover`, `Command`, `Separator`, `Skeleton`, `Toast`, `Alert`, `Progress`, `Avatar`

### 7.2 Compostos de domínio

| Componente | Responsabilidade |
|------------|------------------|
| `AppShell` | Layout sidebar + header + outlet |
| `MobileNav` | Bottom navigation |
| `PageHeader` | Título + descrição + ações |
| `EmptyState` | Ilustração + texto + CTA |
| `StatusBadge` | Mapeia enums → cor + label PT |
| `MoneyDisplay` | Formatação BRL consistente |
| `DateDisplay` | Formatação pt-BR |
| `SearchInput` | Debounced search |
| `PeriodFilter` | Mês vs intervalo + validação |
| `WizardStepper` | Steps numerados com estado |
| `FileDropzone` | Drag-drop + validação tipo |
| `ImportPreviewTable` | Amostra de JSON/CSV |
| `ImportResultCard` | Stats pós-upload + próximo passo |
| `AttentionBanner` | Alertas acionáveis |
| `QuickActionBar` | CTAs contextuais |
| `NotaCard` | Card/list item de nota |
| `NotaForm` | RHF + Zod, registro manual |
| `PaymentList` | Pagamentos vinculados + desvincular |
| `MovimentoCard` | Lançamento bancário na conciliação |
| `MatchSuggestion` | Sugestão com score explicado |
| `NotaCombobox` | Busca de notas candidatas |
| `PagadorInput` | Nubank PIX sem nome |
| `ReportSummary` | KPIs antes de exportar |
| `ExportButton` | Download blob com filename |
| `ConfirmDialog` | Ações destrutivas |
| `CommandPalette` | Navegação rápida ⌘K |

### 7.3 Padrões de feedback

| Situação | Padrão |
|----------|--------|
| Loading | Skeleton na área afetada |
| Erro API | Alert inline + retry |
| Sucesso ação | Toast 3s + invalidação cache |
| Validação form | Inline no campo + resumo no submit |
| Estado vazio | EmptyState com CTA para primeira ação |
| Progresso upload | Progress bar + texto "Enviando..." |

---

## 8. Arquitetura do frontend

### 8.1 Stack

```
React 19 + TypeScript 5
Vite 6
React Router 7
TanStack Query 5
React Hook Form 7 + Zod 3
Tailwind CSS 4 + shadcn/ui
Framer Motion 11
Lucide React
```

### 8.2 Estrutura de pastas (nova)

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── components.json          # shadcn
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx       # lazy routes + Suspense
│   │   ├── providers.tsx    # QueryClient, Theme, Auth, Tooltip
│   │   └── query-client.ts
│   ├── components/
│   │   ├── ui/              # shadcn primitives
│   │   └── ...              # compostos compartilhados
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── pages/
│   │   ├── home/            # ex-dashboard
│   │   ├── notas/
│   │   ├── recebimentos/    # ex-conciliacao
│   │   ├── arquivos/        # importações unificadas
│   │   └── analises/        # ex-relatorios
│   ├── lib/
│   │   ├── api-client.ts    # axios + refresh interceptor
│   │   ├── utils.ts         # cn()
│   │   ├── format.ts        # BRL, datas
│   │   └── constants.ts     # query keys, enums PT
│   └── styles/
│       └── globals.css
```

### 8.3 Padrões por feature

```
features/{name}/
├── api/           # funções puras de chamada HTTP
├── hooks/         # useQuery, useMutation
├── schemas/       # Zod (forms)
├── types/         # interfaces de domínio
├── components/    # UI específica da feature
└── pages/         # route components (lazy)
```

### 8.4 Performance

| Técnica | Onde |
|---------|------|
| Code splitting | `React.lazy` por rota |
| Suspense | Fallback skeleton por página |
| Memoização | Listas longas (notas, lançamentos) |
| Virtualização | Tabelas > 50 linhas (`@tanstack/react-virtual`) |
| Debounce | Busca 300ms |
| Prefetch | Hover em links de navegação |
| Cache | Query staleTime 30s, invalidação granular |

### 8.5 API client (preservar contrato)

```typescript
// lib/api-client.ts
// - baseURL: /api
// - withCredentials: true
// - request: inject Bearer from localStorage
// - response 401: refresh → retry once → redirect /auth/entrar
```

### 8.6 O que será descartado

- Pasta `UI/` inteira (workspace removido do monorepo)
- `frontend/src` atual (substituído por greenfield)
- Dependência `@ui/*` no vite/tsconfig
- Todos os componentes TailAdmin
- Layout sidebar/header atuais
- `shared/copy/glossary.ts` → absorvido em `lib/constants.ts`

### 8.7 O que será recriado (mesma lógica, código novo)

- Services → `features/*/api/`
- Types → `features/*/types/`
- Utils de negócio → `lib/` ou `features/*/lib/`
- Hooks → `features/*/hooks/`
- Validações → Zod schemas

---

## 9. Protótipos de alta fidelidade

### 9.1 Direção visual

- **Estilo:** SaaS 2026 — limpo, arejado, confiança
- **Referências conceituais:** Linear (clareza), Stripe Dashboard (hierarquia), Notion (simplicidade)
- **Não copiar:** cores/layout de produtos específicos

### 9.2 Tela: Início (desktop)

```
Background: #FAFAFA
Sidebar: branco, border-right 1px #E4E4E7
  - Logo + "Gestão Financeira" (16px semibold)
  - Nav items: ícone Lucide 20px + label 14px
  - Item ativo: bg #EFF6FF, text #2563EB, border-left 3px

Header: transparente, saudação "Bom dia, {nome}" 24px semibold
  - Direita: sino com badge contagem, avatar dropdown

Attention panel:
  - Card com border-left 4px #D97706 (warning)
  - Cada item: ícone + texto + botão ghost "Ver"
  - Máximo 4 itens (Lei de Miller)

KPI row: 3 cards iguais, número 32px bold, label 14px muted

Gráfico: área simples, 2 séries (emitido/recebido), sem grid pesado

Quick actions: 3 botões outline mesmo tamanho
```

### 9.3 Tela: Cruzar pagamentos

```
Tabs: underline style, contador em badge

MovimentoCard:
  - Header: banco badge (Asaas=blue, Nubank=purple) + valor 20px bold
  - Meta: data, pagador, descrição (14px muted)
  - Divider
  - MatchSuggestion (se houver):
    - Border #16A34A 1px, bg #F0FDF4
  - "Por quê?" expandable: chips (Nome 95%, Valor exato, Data 3d)
  - Combobox full-width
  - Footer: Button primary "Confirmar" + Button ghost "Pular"
  - Keyboard hints: <Kbd>j</Kbd><Kbd>k</Kbd> em tooltip
```

### 9.4 Tela: Wizard importação

```
Stepper horizontal no topo, step ativo com número em círculo primary

Dropzone:
  - Border dashed 2px #D4D4D8, hover #2563EB
  - Ícone upload 48px, texto "Arraste ou clique"
  - Aceita: .json ou .csv conforme contexto

Preview table: max 5 rows, header sticky

Result card:
  - Ícone check verde grande
  - Números em 3 colunas (novas/atualizadas/ignoradas)
  - Banner "Próximo passo" com CTA primário
```

### 9.5 Dark mode

- Toggle no header (sol/lua)
- Mesmas estruturas, tokens invertidos
- Gráficos: cores ajustadas para contraste em #0A0A0A

---

## 10. Fases de implementação

> Implementação só inicia após validação deste documento.

### Fase 0 — Fundação (2–3 dias)
- [ ] Scaffold Vite + TS + Tailwind + shadcn
- [ ] API client + auth + providers
- [ ] AppShell + router lazy + 404
- [ ] Design tokens + tema claro/escuro

### Fase 1 — Auth + Início (2 dias)
- [ ] Página Entrar
- [ ] Central operacional (agregação dashboard)
- [ ] Attention panel + quick actions

### Fase 2 — Notas (2 dias)
- [ ] Lista + busca + paginação
- [ ] Registrar nota (form Zod)
- [ ] Detalhe pagamentos + desvincular

### Fase 3 — Arquivos (3 dias)
- [ ] Wizard JSON notas + histórico + detalhe
- [ ] Wizard CSV extratos + histórico + detalhe
- [ ] Pré-visualização + resultado + próximo passo

### Fase 4 — Recebimentos (3 dias)
- [ ] Fila pendente + sem correspondência
- [ ] Match suggestion + combobox
- [ ] Nubank pagador + atalhos teclado
- [ ] Desfazer correspondência

### Fase 5 — Análises (2 dias)
- [ ] Situação das notas (preview + CSV)
- [ ] Fluxo de caixa (wizard + XLSX)

### Fase 6 — Polish (2 dias)
- [ ] Mobile nav + bottom sheets
- [ ] Command palette
- [ ] A11y audit + testes
- [ ] Remover `/UI` do monorepo

**Estimativa total:** ~16 dias úteis

---

## 11. Checklist de validação

Antes de iniciar a implementação, confirmar:

- [ ] **IA:** Os 5 grupos de navegação fazem sentido para o usuário leigo?
- [ ] **Rotas:** `/auth/entrar`, `/recebimentos`, `/arquivos/*`, `/analises/*` aprovadas?
- [ ] **Glossário:** Termos em português simples estão corretos?
- [ ] **Wireframes:** Fluxos de wizard e conciliação cobrem os casos reais?
- [ ] **Design System:** Paleta e tipografia aprovadas?
- [ ] **Arquitetura:** Estrutura `features/` por domínio aprovada?
- [ ] **Stack:** shadcn/ui + Framer Motion + Lucide confirmados?
- [ ] **Descarte:** OK apagar `frontend/src` atual e workspace `UI/`?
- [ ] **Backend:** Nenhuma alteração de API — confirmado?

---

## Próximo passo

**Aguardando sua validação.** Responda com ajustes ou confirme para iniciar a Fase 0 (scaffold + fundação).

Sugestões de decisão rápida:
1. Manter rota `/auth/signin` (compatibilidade) ou migrar para `/auth/entrar`?
2. Unificar histórico de importações em uma tela com tabs ou manter separado?
3. Priorizar mobile-first ou desktop-first na implementação?
