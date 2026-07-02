# Backlog de Dívida Técnica

**Governança:** apenas refatorações; não misturar com features.  
**Prioridade:** P0 crítico · P1 alto · P2 médio · P3 baixo

| ID | Item | Prioridade | Status |
|----|------|------------|--------|
| TD-01 | Filtro competência NF no export fluxo | P1 | ✅ `mes_competencia_nf` wired (backend + UI) |
| TD-02 | `isIncomingCredit` no parser Nubank | P1 | ✅ Usado em `processUpload` + testes |
| TD-03 | Docs `frontend/docs/*` desatualizados vs DS | P2 | ✅ Atualizados |
| TD-04 | DataTable sem ordenação/colunas configuráveis | P2 | ✅ Fase 9 |
| TD-05 | Cobertura de testes UI < 20% | P1 | ✅ E2E Playwright + axe |
| TD-06 | WCAG AA audit formal pendente | P1 | ✅ axe gate + `docs/WCAG-AUDIT.md` |
| TD-07 | Virtualização tabelas 400+ notas | P3 | ✅ Fase 9 |
| TD-08 | Aba Reembolso Excel sem UI | P3 | ✅ Aba preenchida automaticamente (como cartão) |
| TD-09 | `ignorado` vs `extrato` enum inconsistente | P2 | ✅ Padronizado em `extrato`; `ignorado` removido |

**Última revisão:** 2026-07-02 — backlog zerado.
