# Honest — API de emissão de NF

> **DEPRECADO (2026-07-03)**  
> A emissão fiscal será feita pelas **APIs oficiais das prefeituras**.  
> Ver **`docs/PREFEITURA-EMISSAO.md`**.

A integração Honest permanece apenas para **importação** de notas (`NfsEmitidas`).

---

## Histórico

Este documento descrevia a mutation experimental `NfEmitir` no GraphQL da Honest.  
O código em `honest-emissao.util.ts` e `HonestIntegrationService.emitirNf()` foi mantido temporariamente para referência, mas **não é mais chamado** pelo fluxo de emissão.

O canal ativo é `PrefeituraEmissaoService` → `SpNfseEmissaoProvider` (e futuros providers por município).
