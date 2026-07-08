# Mercado e vetores de ataque — Fecho Document Core

**Objetivo:** entender onde ganhar clientes **amanhã** com o diferencial de interpretação de documentos — sem dispersar em ERP/TMS genérico.

**Última revisão:** 2026-07-03  
**Base:** `POSITIONING-DOCUMENT-INTELLIGENCE.md`, `PILOTO-LOGISTICA-DOCUMENTOS.md`, `ROADMAP-MODULAR.md`

---

## 1. Tese em uma frase

> Vocês não vendem software de gestão — vendem **capacidade**: transformar qualquer arquivo brasileiro (XML, PDF, CNAB, OFX…) em dado confiável, relacionado e integrado.

O ativo é o **motor** (ler → validar → relacionar → integrar). Finance, logística e saúde são **verticais** que pagam pelo motor.

---

## 2. O mercado real (Brasil)

### 2.1 Intelligent Document Processing (IDP)

Segmento global em alta: OCR + classificação + extração + validação + integração.

| Player global | Perfil | Gap no Brasil |
|---------------|--------|---------------|
| UiPath, Abbyy, Rossum | Enterprise, caro | Pouco domínio fiscal BR |
| APIs genéricas (Google Document AI) | PDF genérico | Não entende CT-e, TISS, CNAB |
| **Fecho (oportunidade)** | **Fiscal + bancário + logística BR** | Especialização + regras + conciliação |

**Vantagem:** IDP global não nasce sabendo chave NF-e, tomador CT-e, layout Asaas ou guia TISS.

### 2.2 Quem sofre (e paga) — mapa de segmentos

| Segmento | Documentos/dia (típico PME) | Dor #1 | Disposto a pagar? | Fit Fecho hoje |
|----------|----------------------------|--------|-------------------|----------------|
| **Transportadora pequena** | 20–200 XML CT-e/NF-e | Digitar + fechar PIX no Excel | Alta (R$ 500–2k/mês) | Médio — falta parser CT-e |
| **BPO financeiro** | 500+ PDF/XML/boletos | Conciliação manual multi-cliente | Muito alta | **Alto** — extrato + match já existe |
| **Escritório contábil** | 1000+ XML NF | Importar SPED/XML para sistema | Alta | Médio — import NF parcial |
| **Distribuidor / e-commerce** | NF-e + boleto + extrato | Vínculo pedido-nota-pagamento | Alta | Médio |
| **Clínica / operadora saúde** | TISS XML + guias | Lote glosa + validação | Muito alta | **Alto** — know-how TISS |
| **Indústria PME** | EDI + NF entrada | AP manual | Média | Baixo hoje |
| **Software house** | N/A | Precisa parser/API BR | Alta (API usage) | Médio — precisa API pública |

### 2.3 Onde está o dinheiro (ranking pragmático)

Critérios: **dor aguda** × **já temos código** × **ciclo de venda curto** × **ticket**.

| Rank | Vetor de ataque | Por quê |
|------|-----------------|---------|
| **1** | **Conciliação documento ↔ pagamento** (Finance) | Já construído; vende em 30 dias |
| **2** | **Ingestão em lote** (pasta/ZIP → inventário) | Diferencial visual; poucos fazem bem no BR |
| **3** | **CT-e + extrato** (logística) | Mercado escolhido; dor clara |
| **4** | **BPO / contabilidade multi-CNPJ** | Volume alto; white-label |
| **5** | **TISS / saúde** | Poucos concorrentes; vocês conhecem |
| **6** | **API para devs** | Escala longo prazo; não primeiro cliente |
| **7** | **Marketplace 50 conectores** | Ativo ano 2+; não wedge |

**Não atacar primeiro:** TMS completo, WMS, competir com TOTVS, SPED enterprise.

---

## 3. O moat real (o que copiar é difícil)

| Capacidade | Commodity? | Moat Fecho |
|------------|------------|------------|
| Ler XML | Sim | Não |
| **Relacionar** NF + boleto + PIX + extrato mesma operação | **Não** | **Sim** |
| **Regras de negócio BR** (conciliação nome/valor/data) | **Não** | **Sim** |
| **Corrigir** XML inválido + sugerir fix | Raro | Sim |
| **Perfis aprendidos** (RAG por layout banco/NF) | Raro | Sim (já iniciado) |
| Emissor CT-e | Commodity | Não competir |

**Pitch técnico:** *“Não somos parser — somos o motor que fecha a operação.”*

---

## 4. Arquitetura de valor (4 camadas)

Visão de longo prazo alinhada ao que vocês descreveram:

```
┌─────────────────────────────────────────┐
│           Fecho Platform (SaaS/API)      │
├─────────────────────────────────────────┤
│  Document Core — parse, validate, envelope│
├─────────────────────────────────────────┤
│  Connector Marketplace                   │
│  CNAB │ OFX │ NF-e │ CT-e │ TISS │ PDF…  │
├─────────────────────────────────────────┤
│  Automation Engine                       │
│  regras │ workflows │ conciliação │ alertas│
├─────────────────────────────────────────┤
│  Apps: Finance │ Fiscal │ Logística │ Saúde│
└─────────────────────────────────────────┘
```

**Ordem de construção (não inverter):**

1. Document Core + 2–3 conectores que **já quase existem**
2. Automation Engine mínimo (regras de vínculo + conciliação)
3. 1 vertical comercial (logística **ou** BPO)
4. API pública
5. Marketplace aberto

---

## 5. Marketplace de conectores — o que é realista

### Tier 1 — já no código ou quase (0–3 meses)

| Conector | Status | Cliente tipo |
|----------|--------|--------------|
| CSV extrato (Asaas, Nubank, custom) | ✅ | Financeiro, logística |
| JSON NF (Honest-like) | ✅ | Serviços |
| PDF extrato (análise LLM) | ✅ parcial | BPO |
| OFX | Roadmap | Financeiro |
| CNAB 240/400 | Roadmap | BPO, contábil |

### Tier 2 — vertical logística (3–6 meses)

| Conector | Cliente |
|----------|---------|
| CT-e XML | Transportadora |
| NF-e XML | Distribuidor |
| MDF-e XML | Transportadora |

### Tier 3 — saúde (paralelo se tiver canal)

| Conector | Cliente |
|----------|---------|
| TISS XML | Clínica, operadora |
| Guia / lote | Hospital |

### Tier 4 — integrações sistema (ano 2+)

Omie, Bling, Tiny, Conta Azul, SAP — **só com demanda paga** (R$ 15k+ setup por conector).

**Regra:** conector novo só entra no marketplace depois de **1 cliente pagante** que financiou o desenvolvimento.

---

## 6. Quatro linhas de receita

| Linha | O que vende | Quando | Ticket |
|-------|-------------|--------|--------|
| **1. SaaS** | Painel: arrasta pasta → organizado → conciliado | **Agora** | R$ 300–2k/mês |
| **2. API** | `POST /documents` → JSON + webhook | 6–12 meses | R$ 0,10–0,50/doc |
| **3. White label** | BPO/contábil com marca deles | 6–12 meses | R$ 2k–10k/mês |
| **4. Conector sob medida** | TXT proprietário, ERP legado | Sob demanda | R$ 10k–50k projeto |

**Foco ano 1:** linha 1 (SaaS) + projetos linha 4 que viram conector reutilizável.

---

## 7. Três jogadas comerciais concretas (próximos 90 dias)

### Jogada A — Logística documental (escolhida)

- **Quem:** transportadora 20–500 CT-e/mês
- **Oferta:** piloto 30 dias — pasta XML + conciliação extrato
- **Doc:** `PILOTO-LOGISTICA-DOCUMENTOS.md`
- **Meta:** 1 cliente pago R$ 497+/mês

### Jogada B — BPO financeiro (paralela, mesmo motor)

- **Quem:** BPO que atende 10–30 CNPJs
- **Oferta:** “Importe extratos de qualquer banco + concilie sem planilha”
- **Vantagem:** **zero dev novo** — produto atual quase pronto
- **Meta:** 1 BPO white-label interessado

### Jogada C — Saúde TISS (se tiver relacionamento)

- **Quem:** clínica ou operadora pequena
- **Oferta:** validar lote TISS + inconsistências antes do envio
- **Vantagem:** know-how + pouca concorrência
- **Meta:** 1 POC pago

**Recomendação:** **A + B em paralelo** — BPO gera caixa rápido; logística valida expansão CT-e.

---

## 8. Funil de produto (o que o cliente vê)

```
Arrasta pasta / encaminha e-mail / API upload
        ↓
   Identifica tipo (CT-e, NF-e, OFX, boleto…)
        ↓
   Lê + valida + mostra erros corrigíveis
        ↓
   Relaciona documentos da mesma operação
        ↓
   Integra (Finance, ERP, webhook)
        ↓
   Concilia pagamento (opcional)
        ↓
   Dashboard + export Excel/API
```

Cada etapa pode ser **SKU** ou etapa do plano.

---

## 9. API (visão — não prioridade semana 1)

```http
POST /api/v1/documents
Content-Type: multipart/form-data

→ 202 Accepted
{
  "id": "doc_abc",
  "docType": "cte",
  "envelope": { ... },
  "validation": { "ok": true },
  "links": [ { "rel": "boleto_de", "documentId": "doc_xyz" } ]
}
```

Webhook: `document.processed`, `document.linked`, `conciliation.suggested`.

**Monetização:** tier gratuito 100 docs/mês; depois metered.

---

## 10. Automation Engine (regras sem código — fase 2)

Exemplos de regras configuráveis:

| Regra | Ação |
|-------|------|
| Se CT-e tomador = CNPJ X e valor = extrato Y | Sugerir vínculo score 95% |
| Se XML inválido schema | Bloquear + e-mail operador |
| Se NF cancelada | Não conciliar |
| Se pasta > 50 arquivos | Fila assíncrona + notificação |

v1: regras **fixas no código** (conciliação atual).  
v2: UI “se então” para BPO.

---

## 11. O que NÃO fazer (anti-padrões)

| Armadilha | Por quê |
|-----------|---------|
| Construir 20 conectores antes de 1 cliente | Ativo morto |
| Vender “plataforma completa” | Ciclo longo, confunde |
| Competir em emissão CT-e | Commodity |
| Microsserviços antes de PMF | Overhead |
| Ignorar BPO (só logística) | Deixa dinheiro rápido na mesa |
| API antes de UI que funciona | Dev sem caso de uso |

---

## 12. Tamanho de mercado (ordem de grandeza BR)

| Segmento | Empresas (estimativa) | Nota |
|----------|----------------------|------|
| Transportadoras ativas | ~150–250 mil | Maioria micro |
| BPOs financeiros | ~5–15 mil | Alto volume doc |
| Escritórios contábeis | ~80 mil | XML NF em massa |
| Clínicas / consultórios | ~200 mil+ | TISS onde aplicável |
| PME com NF + banco | **milhões** | Wedge financeiro genérico |

**SAM realista ano 1:** 500–2.000 empresas que pagariam R$ 300–1.500/mês por **eliminar digitação/conferência** — não precisa dominar o mercado inteiro.

---

## 13. Posicionamento final (site / pitch)

**Headline:**

> Automatizamos documentos da sua empresa.

**Sub:**

> Leitura, validação e integração de XML, PDF, extratos e arquivos fiscais brasileiros — sem digitação, sem planilha.

**Não dizer na home:** ERP, TMS, WMS.

**Dizer:** transportadoras, BPOs, contabilidades, operações que recebem **pastas de arquivos**.

---

## 14. Roadmap de ataque (12 meses)

| Mês | Produto | Comercial |
|-----|---------|-----------|
| 1–2 | Document Core v0 + ingest lote | Piloto logística + outreach BPO |
| 3–4 | Parser CT-e + vínculo extrato | 1º cliente logística pago |
| 5–6 | OFX/CNAB + multi-tenant BPO | 1º BPO white-label |
| 7–8 | Automation rules v1 + inbox e-mail | Expandir conectores |
| 9–10 | API beta | 2 software houses |
| 11–12 | TISS connector (se canal) ou NF-e lote contábil | Segundo vertical |

---

## 15. Decisão estratégica recomendada

| Pergunta | Resposta |
|----------|----------|
| Produto ou capacidade? | **Capacidade** (vender resultado: horas devolvidas) |
| Módulo ou conector? | **Conector** no discurso; módulo é empacotamento |
| Logística ou transversal? | **Logística = narrativa GTM**; motor = transversal |
| Primeiro cliente? | **BPO (caixa rápido)** + **transportadora (validação CT-e)** |
| Primeiro código? | Ingest lote + CT-e parser + match (já especificado) |

---

## 16. Documentos relacionados

| Doc | Conteúdo |
|-----|----------|
| `POSITIONING-DOCUMENT-INTELLIGENCE.md` | Visão Document Core |
| `connectors/CTE-PARSER.md` | Spec CT-e |
| `PILOTO-LOGISTICA-DOCUMENTOS.md` | Piloto 30 dias |
| `IMPORT-INTELLIGENCE-SPEC.md` | Motor atual |
| `ROADMAP-MODULAR.md` | Fases técnicas |

---

## 17. Próxima ação (esta semana)

1. **5 conversas** — 2 transportadoras + 2 BPOs + 1 contábil (15 min cada).
2. Pergunta única: *“Quantas horas por dia alguém abre arquivo e digita?”*
3. Quem disser **> 2h/dia** → oferta piloto.
4. Paralelo: implementar **ingest lote** (UI) mesmo antes do CT-e — demo vende.
