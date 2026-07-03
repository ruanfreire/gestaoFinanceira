# Import Intelligence — Gemini + RAG

Plano implementado no Fecho para importação bancária configurável pelo usuário.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/import-intelligence/analyze` | Analisa CSV/JSON/PDF (heurística + Gemini + RAG) |
| POST | `/api/import-intelligence/preview` | Prévia com mapping |
| POST | `/api/import-intelligence/profiles` | Salva perfil confirmado |
| GET | `/api/import-intelligence/profiles` | Lista perfis |
| POST | `/api/import-intelligence/import` | Importa com `profile_id` |
| POST | `/api/import-intelligence/feedback` | Feedback para RAG |
| GET | `/api/import-intelligence/metrics` | Métricas de qualidade |
| GET | `/api/import-intelligence/sessions` | Sessões recentes de análise |
| GET | `/api/import-intelligence/ops` | Dashboard ops (métricas + Gemini + sessões) |

## Provedores de IA (sem obrigar Google)

| `IMPORT_AI_PROVIDER` | Custo | Como ativar |
|----------------------|-------|-------------|
| `none` | R$ 0 | Padrão — só heurística + RAG por texto |
| `groq` | Free tier | Chave em https://console.groq.com/keys |
| `ollama` | R$ 0 local | `ollama pull llama3.2` + `OLLAMA_ENABLED=true` |
| `gemini` | Pode pedir billing | Chave `AIzaSy...` no AI Studio |

## Variáveis de ambiente

```env
IMPORT_AI_PROVIDER=none
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
GEMINI_API_KEY=
GEMINI_MODEL_ANALYSIS=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
IMPORT_AI_ENABLED=true
IMPORT_AI_MIN_CONFIDENCE=0.85
IMPORT_AI_DAILY_LIMIT=50
GEMINI_MODEL_COMPLEX=gemini-2.0-flash
```

## Fluxo

1. Upload → análise heurística
2. RAG busca perfis similares (embeddings Gemini)
3. Se confiança baixa → Gemini sugere mapping (JSON)
4. Prévia normalizada → usuário confirma
5. Perfil salvo → indexado no RAG
6. Importações seguintes usam motor determinístico

## Garantias

- Prévia e importação usam o **mesmo parser** (`parseWithMapping`)
- IA nunca importa sem confirmação do usuário
- Dados sensíveis sanitizados antes do Gemini

## Fases entregues

| Fase | Status |
|------|--------|
| 0 Fundação | ✅ Módulo, schemas, heurística, fixtures |
| 1 Motor genérico | ✅ analyze/preview/import — perfis só criados pelo usuário |
| 2 Gemini | ✅ Híbrido heurística + structured JSON |
| 3 RAG v1 | ✅ Embeddings, indexação, feedback |
| 4 Coerência | ✅ Histórico custom, fluxo `banco=custom&profile_id`, métricas |
| 5 Qualidade | ✅ 5 fixtures CI, `quality_score`, endpoint `/metrics` |
| 6 Formatos | ✅ JSON (transações + detecção NF), PDF (análise Gemini, import via CSV) |
| 7 Operações | ✅ Log Gemini, limite diário, `/ops`, `/sessions`, doc usuário |

## Documentação usuário

Ver [COMO-IMPORTAR-EXTRATO.md](./COMO-IMPORTAR-EXTRATO.md).

## Exportação fluxo de caixa (banco custom)

```
GET /api/relatorios/exportacao-fluxo-caixa?banco=custom&profile_id=<id>&mes_pagamento=2026-05
```

O cabeçalho usa `banco_label` e `conta_corrente` do `ImportProfile`.
