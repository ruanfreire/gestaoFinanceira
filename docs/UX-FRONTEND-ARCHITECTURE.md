# Fecho — Arquitetura UX & Frontend

**Versão:** 1.0 · **Data:** 2026-07-06  
**Público:** Product, Design, Frontend, Engenharia  
**Relacionado:** `POSITIONING-DOCUMENT-INTELLIGENCE.md`, `SUPERADMIN-MODULOS.md`, `ROADMAP-MODULAR.md`

---

## 1. Norte — uma frase

> **O documento é o centro. O usuário só vê tarefas. O sistema ensina; o usuário nunca aprende.**

Toda decisão de interface deve passar por:

| Pergunta certa | Pergunta errada |
|----------------|-----------------|
| O que você quer fazer agora? | Qual módulo quer acessar? |
| O que aconteceu hoje? | Onde está o parser? |
| Deseja importar estes 42 arquivos? | Qual layout/schema usar? |

---

## 2. Estado atual vs alvo

### 2.1 O que já temos (base sólida)

| Área | Hoje | Alinhamento com visão |
|------|------|------------------------|
| Design System | `frontend/src/design-system/` — atoms, molecules, organisms, templates | Bom fundamento Stripe/Linear |
| Command palette | `⌘K` + `command-routes.ts` | Pesquisa global — expandir |
| Home / KPIs | `features/home/` | Gestor parcial; falta ângulo documento |
| Conciliação assistida | `recebimentos/` + undo | IA invisível — padrão correto |
| Wizard emissão | `emissao-wizard.tsx` | Modelo para configurações |
| Entitlements | `enabled_modules` + menu filtrado | Módulo técnico oculto — falta camada de **produto** |
| Superadmin | `features/platform/` embutido no mesmo SPA | Precisa app separada |

### 2.2 Problemas de UX atuais (dívida)

| Problema | Exemplo no código | Impacto leigo |
|----------|-------------------|---------------|
| Menu orientado a artefato | "Enviar CT-e / documentos", "Confirmar frete (CT-e)" | Expõe siglas fiscais |
| Rotas técnicas | `/arquivos/importar-banco`, `/configuracoes/importacao-ia` | Parece ERP |
| Configurações planas | Lista de cards em `configuracoes-page.tsx` | Sobrecarga cognitiva |
| Import pede perfil/layout | `importar-banco-page.tsx` | Viola regra "arrastar e pronto" |
| Superadmin no mesmo bundle | `/superadmin` no `router.tsx` | Mistura públicos |
| Documentos = upload técnico | `documentos-page.tsx` | Não é inbox nem timeline |

### 2.3 Alvo

**Quatro aplicações** no monorepo, **um Design System**, **uma API**:

```
apps/
  client/          → Cliente (leigo) + parte do Gestor
  manager/         → Gestor (visão agregada, opcional merge com client)
  superadmin/      → Equipe Fecho
  developer/       → Console técnico

packages/
  design-system/   → tokens, atoms → organisms (extraído de hoje)
  api-client/      → tipos + hooks compartilhados
  entitlements-ui/ → mapeia módulo técnico → item de menu humano
```

**Fase 1 (pragmática):** manter um SPA, mas **reorganizar rotas, menu e copy** como se fossem quatro apps. **Fase 2:** split de bundles/deploy.

---

## 3. Quatro aplicações — escopo e princípios

### 3.1 App Cliente (`apps/client`)

**Quem:** dono, financeiro, auxiliar, operador.  
**Nunca vê:** parser, connector, schema, billing interno, feature flags, logs, tokens.

#### Menu fixo (máx. 6 itens)

| Ícone | Rótulo | Quando aparece | Agrupa (rotas internas) |
|-------|--------|----------------|-------------------------|
| Início | Início | Sempre | Dashboard do dia |
| Documentos | Documentos | `document_core` ou qualquer ingestão | Inbox, enviar, timeline |
| Financeiro | Financeiro | `finance` | Notas, recebimentos, extratos |
| Operações | Operações | `logistics_frete` ou futuro TMS/WMS | Frete, entregas, romaneio |
| Relatórios | Relatórios | `finance` | Situação, fluxo de caixa |
| Configurações | Configurações | Owner | Wizard por tarefa |

**Mapeamento módulo técnico → menu humano** (`packages/entitlements-ui`):

```ts
// O cliente NUNCA lê estas chaves na UI
const PRODUCT_NAV = {
  finance:        { section: 'financeiro', label: 'Financeiro' },
  document_core:  { section: 'documentos', label: 'Documentos' },
  logistics_frete:{ section: 'operacoes',  label: 'Operações', task: 'Acompanhar entregas e fretes' },
  fiscal_emissao: { section: 'financeiro', sub: 'Emitir notas' },
  integrations_honest: { hidden: true }, // só wizard em config, se owner
};
```

#### Exemplo — só Financeiro contratado

```
Início · Financeiro · Relatórios · Configurações
```

#### Exemplo — Financeiro + Logística

```
Início · Documentos · Operações · Financeiro · Relatórios · Configurações
```

---

### 3.2 App Gestor (`apps/manager`)

**Quem:** dono ou gerente que quer visão, não operação.  
Pode ser **modo do mesmo app** (toggle "Visão gestor" no header) na Fase 1.

| Tela | Pergunta que responde |
|------|----------------------|
| Painel executivo | Quanto entrou/saiu no período? |
| Pendências | O que está travado? |
| Documentos | Volume processado vs erro |
| Equipe | Quem fez o quê |
| Alertas | O que precisa de decisão |

**Diferença do Cliente:** menos botões de ação, mais comparação e tendência.

---

### 3.3 App SuperAdmin (`apps/superadmin`)

**Quem:** equipe Fecho. **Frontend separado**, sem limite funcional.

```
Dashboard
Organizações
Clientes
Usuários
Planos
Billing
Conectores          ← técnico OK aqui
Document Core       ← parsers, classificadores, kill switch
IA                  ← prompts, limites, modelos
Logs
Auditoria
Integrações
Feature Flags       ← enabled_modules
Configurações globais
Métricas
Monitoramento
Suporte             ← impersonate
```

**Hoje:** só Dashboard + Clientes. **Migrar** `features/platform/` para este app.

---

### 3.4 Developer Console (`apps/developer`)

**Quem:** engenharia Fecho / parceiros API.

```
API Keys
Webhooks
Schemas & OpenAPI
Connectors (dev)
Sandbox ingest
Event stream
Rate limits
```

Sem acesso a dados reais de cliente sem impersonate auditado.

---

## 4. Mapa de rotas — App Cliente (alvo)

Base: `/:orgSlug/...` (mantém multi-tenant atual).

### 4.1 Início

| Rota | Tela | Wireframe resumo |
|------|------|------------------|
| `/` | **Hoje** | Hero "O que aconteceu hoje" + 6 cards grandes + alertas |

```
┌─────────────────────────────────────────────────────────┐
│  Bom dia, Ana · Hoje, 6 de julho                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 12 docs  │ │ 3 pend.  │ │ R$ 48k   │ │ 2 alertas│   │
│  │ recebidos│ │ revisar  │ │ recebido │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  [ Arrastar arquivos aqui ]  ou  [ O que fazer agora? ]   │
│  ─── Atividade recente (timeline) ───                     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Documentos

| Rota | Tela |
|------|------|
| `/documentos` | Inbox unificada (substitui upload CT-e isolado) |
| `/documentos/enviar` | Dropzone universal |
| `/documentos/:id` | Detalhe em cartão + timeline de relacionamentos |
| `/documentos/pendentes` | Fila "precisa de você" |

**Cartão de documento (nunca XML):**

```
┌─────────────────────────────────────┐
│ Nota Fiscal · R$ 12.450,00          │
│ Fornecedor XYZ · 05/07/2026         │
│ ● Processado                        │
│ Relacionado: Boleto · Extrato       │
│ [ Ver histórico ]                   │
└─────────────────────────────────────┘
```

**Timeline de relacionamento:**

```
Pedido → Nota → Boleto → Pagamento → Extrato → Conciliado ✓
```

### 4.3 Financeiro

| Rota atual | Rota alvo | Copy alvo |
|------------|-----------|-----------|
| `/notas` | `/financeiro/notas` | Minhas notas |
| `/recebimentos` | `/financeiro/confirmar` | Confirmar recebimentos |
| `/arquivos/importar-banco` | `/financeiro/enviar-extrato` | Enviar extrato |
| `/arquivos/notas` | `/financeiro/enviar-notas` | Enviar notas |
| `/arquivos/historico` | `/financeiro/historico` | Histórico |

**Redirects 301** das rotas antigas (já existe padrão `LegacyRedirect`).

### 4.4 Operações

| Rota atual | Rota alvo | Copy alvo |
|------------|-----------|-----------|
| `/documentos` (CT-e) | merge em `/documentos` | — |
| `/frete/recebimentos` | `/operacoes/confirmar-entregas` | Confirmar pagamentos de frete |

**Nunca** "CT-e", "TMS", "WMS" no menu.

### 4.5 Relatórios

| Rota atual | Rota alvo |
|------------|-----------|
| `/analises/situacao` | `/relatorios/situacao` |
| `/analises/fluxo-caixa` | `/relatorios/fluxo-caixa` |

### 4.6 Configurações (wizard-only)

| Rota | Formato |
|------|---------|
| `/configuracoes` | Hub com 4–6 cards grandes (não lista técnica) |
| `/configuracoes/empresa` | Wizard 3 passos |
| `/configuracoes/banco` | Wizard: banco → formato → teste |
| `/configuracoes/equipe` | Existente |
| `/configuracoes/emissao` | Wizard NFS-e (owner) |

**Remover da UI cliente:** `importacao-ia`, `integracoes` como card solto — virar passo do wizard de banco ou flag superadmin.

---

## 5. Fluxos críticos (jornadas)

### 5.1 Importação universal

```
Usuário arrasta pasta/ZIP/múltiplos arquivos
        ↓
Sistema classifica (silencioso)
        ↓
Modal: "Encontramos 42 XML, 8 PDF, 3 extratos. Importar tudo?"
        ↓
[ Sim, importar ]  [ Escolher ]
        ↓
Progresso por tipo (não por parser)
        ↓
Resumo: "38 ok · 4 precisam de você"
        ↓
CTA: [ Ver pendentes ]
```

**Regra:** zero campos de tipo, layout, perfil, schema na happy path.

### 5.2 Conciliação assistida (IA invisível)

```
Extrato importado
        ↓
Card: "Este PIX de R$ 1.200 parece ser da Nota #4521"
        ↓
[ Sim, conciliar ]  [ Não é essa ]  [ Decidir depois ]
        ↓
Toast + Undo (já existe em recebimentos)
```

### 5.3 Erro de documento

```
❌ Errado: Namespace inválido, linha 312
✅ Certo:

┌────────────────────────────────────────┐
│ Não conseguimos ler este arquivo       │
│ O documento pode estar incompleto.     │
│ [ Tentar corrigir automaticamente ]    │
│ [ Enviar outro arquivo ]               │
│ Ver detalhes técnicos ▾ (colapsado)    │
└────────────────────────────────────────┘
```

---

## 6. Wireframes — telas prioritárias (MVP UX)

### T1 — Início (refatorar `home-page.tsx`)

- Remover jargão "importações" → "documentos recebidos"
- Adicionar dropzone hero
- Cards: Documentos hoje · Pendentes · Recebido · A confirmar · Alertas
- Seção "Precisa da sua atenção" (max 3 itens)

### T2 — Documentos inbox (nova)

- Tabs: Todos · Pendentes · Com erro
- Filtro por tipo humano: Nota · Boleto · Extrato · Transporte · Outros
- Busca por fornecedor, valor, data

### T3 — Detalhe documento + timeline (nova)

- Header: tipo + valor + status pill
- Timeline vertical relacionamentos
- Ações contextuais (conciliar, baixar PDF, ignorar)

### T4 — Financeiro hub (nova shell)

- Sub-nav horizontal: Notas · Confirmar · Enviar · Histórico
- Unifica rotas espalhadas em `arquivos/` e `notas/`

### T5 — Importação única (refatorar `importar-banco-page.tsx`)

- Modo simples default; "modo avançado" colapsado (superadmin/dev only)

### T6 — Configurações wizard banco (nova)

```
Passo 1: Qual banco?     [Itaú] [Bradesco] [Nubank] [Outro]
Passo 2: Como envia?     [Arquivo] [E-mail] [Conectado]
Passo 3: Teste           Arraste um extrato de exemplo
```

### T7 — Superadmin organização (expandir `superadmin-client-detail-page.tsx`)

- Abas: Resumo · Módulos · Plano · Usuários · Auditoria · Impersonar

---

## 7. Design System — inventário e gaps

### 7.1 Existente (`design-system/`)

| Categoria | Componentes |
|-----------|-------------|
| Atoms | Button, Badge, Typography, Avatar, Skeleton, Spinner |
| Molecules | PrefetchLink, UploadArea, EmptyState, ErrorState, PageHeader, StatisticCard, TaskGuide |
| Organisms | AppShell, Card, DataTable, Modal, Sheet, CommandPalette, AttentionPanel, Wizard |
| Templates | Auth, List, Wizard, Conciliation |

### 7.2 A criar (prioridade)

| Componente | Uso |
|------------|-----|
| `DocumentCard` | Inbox documentos |
| `RelationshipTimeline` | Pedido→Nota→Pagamento |
| `ImportSummaryModal` | Pós-drop pasta |
| `AssistedActionCard` | IA invisível (conciliar?) |
| `FriendlyErrorPanel` | Erros com "corrigir" |
| `ProductSubNav` | Financeiro / Operações tabs |
| `DropzoneHero` | Início + enviar documentos |
| `WizardShell` | Configurações |
| `ManagerKpiBoard` | Gestor |
| `KanbanBoard` | Operações futuras |

### 7.3 Tokens visuais

Manter paleta atual (`tokens.css`). Regras:

- Fundo branco/surface, uma cor de acento (primary)
- Espaçamento generoso: mínimo 16px entre blocos, 24px em cards
- Tipografia: título 1 por tela, corpo 14–16px, captions só para meta
- Ícones Lucide outline, 20–24px em ações primárias

---

## 8. Estrutura de pastas alvo (Fase 1 dentro do monorepo atual)

```
frontend/
  src/
    apps/
      client/
        router.tsx
        nav/
          product-nav.config.ts    # menu humano
          build-client-nav.ts
        pages/
          inicio/
          documentos/
          financeiro/
          operacoes/
          relatorios/
          configuracoes/
      superadmin/
        router.tsx
        pages/                   # migrar features/platform
      manager/                   # opcional fase 1.5
      developer/                 # fase 3
    packages/
      design-system/             # mover design-system/ para cá (fase 2)
      entitlements-ui/
        module-to-product.ts
    features/                    # legado — migrar gradualmente
    shared/
      api/
      hooks/
      copy/                        # strings user-facing centralizadas
        pt-BR/
          financeiro.ts
          documentos.ts
          erros.ts
```

---

## 9. Copy guide — palavras proibidas no Cliente

| Proibido | Usar |
|----------|------|
| CT-e | Nota de transporte / Documento de frete |
| Parser | Leitura automática |
| Connector | Conexão |
| Schema | — (não mencionar) |
| Perfil de importação | Seu banco |
| Conciliação | Confirmar recebimento |
| XML / JSON | Arquivo / Documento |
| Módulo | — |
| API / Webhook | Conexão automática |
| Feature flag | — |

---

## 10. Acessibilidade & responsivo

- WCAG AA: contraste 4.5:1 texto, focus ring visível
- Navegação por teclado: sidebar, command palette, modais com trap
- ARIA: `aria-current` em nav (já em `sidebar-nav.tsx`), labels em dropzone
- Mobile: bottom nav max 5 itens; ações primárias no polegar
- Desktop first; gestor em tablet landscape

---

## 11. Plano de migração (4 ondas)

### Onda 1 — Menu e copy (1–2 sprints)

- [ ] `product-nav.config.ts` + refatorar `sidebar-nav.tsx`
- [ ] Renomear labels ("Confirmar frete" → "Confirmar entregas")
- [ ] Agrupar rotas sob `/financeiro/*` com redirects
- [ ] Esconder `importacao-ia` do cliente
- [ ] Centralizar copy em `shared/copy/`

### Onda 2 — Documento no centro (2–3 sprints)

- [ ] Inbox `/documentos` unificada
- [ ] `DocumentCard` + `RelationshipTimeline`
- [ ] Home com dropzone hero
- [ ] `ImportSummaryModal` no fluxo de upload

### Onda 3 — Wizards e erros (1–2 sprints)

- [ ] Configurações só wizard
- [ ] `FriendlyErrorPanel` em ingest
- [ ] `AssistedActionCard` em recebimentos

### Onda 4 — Split apps (2+ sprints)

- [ ] Extrair `apps/superadmin` bundle separado
- [ ] `apps/developer` scaffold
- [ ] `packages/design-system` publish interno

---

## 12. Métricas de sucesso UX

| Métrica | Meta |
|---------|------|
| Time-to-first-import | < 60s após login |
| Cliques até importar extrato | ≤ 3 |
| Suporte "o que é CT-e?" | → 0 |
| Task completion config banco | > 80% sem suporte |
| NPS leigo (auxiliar adm.) | > 40 |

---

## 13. Referência rápida — mapa mental

```
                    ┌─────────────┐
                    │  DOCUMENTO  │
                    │   (centro)  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ Financeiro│   │ Operações │   │ Relatórios│
     │ (tarefas) │   │ (tarefas) │   │ (gestor)  │
     └──────────┘   └──────────┘   └──────────┘
```

O usuário navega por **intenção**. O módulo técnico (`logistics_frete`, `document_core`) só existe no superadmin e no código.

---

## 14. Próximo passo recomendado

Implementar **Onda 1** imediatamente: novo menu produto + rotas `/financeiro` + copy — alto impacto, baixo risco, sem split de app.

Ver também o canvas interativo: [fecho-ux-architecture.canvas.tsx](/Users/ruanf/.cursor/projects/c-Users-ruanf-OneDrive-rea-de-Trabalho-GestaoFinanceira/canvases/fecho-ux-architecture.canvas.tsx)
