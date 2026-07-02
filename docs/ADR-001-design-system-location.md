# ADR-001 — Design System como `frontend/src/design-system/`

**Status:** Aceito  
**Data:** 2026-07-01  
**Decisores:** Chief Architect

## Contexto

A missão referencia biblioteca `/UI`. No repositório, a pasta `/UI` foi removida; componentes vivem em `frontend/src/design-system/` (Atomic Design).

## Problema

Risco de duplicação se agentes criarem componentes fora do DS ou recriarem `/UI`.

## Alternativas

1. Recriar pasta `/UI` na raiz — rejeitado (duplicação, dois imports).
2. Manter `design-system/` como fonte única — **aceito**.
3. Alias npm `@ui` — adiado (Fase 9).

## Decisão

`frontend/src/design-system/` é a biblioteca oficial. Import via `@/design-system/*`.

## Impactos

- Agente 02 (Frontend) só adiciona componentes em `atoms|molecules|organisms|templates`.
- Agente 01 (Produto) referencia nomes de componentes existentes nos wireframes.

## Reversão

Reintroduzir `/UI` como re-export se exigência externa; não planejado.
