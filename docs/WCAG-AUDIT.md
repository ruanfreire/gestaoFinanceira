# Auditoria WCAG 2.1 AA — Gestão Financeira

**Data:** 2026-07-02  
**Escopo:** telas autenticadas (início, notas) + login  
**Ferramenta:** `@axe-core/playwright` (gate em `e2e/a11y.spec.ts`)

## Resultado

| Critério | Status | Ação |
|----------|--------|------|
| 1.1.1 Conteúdo não textual | ✅ | Ícones decorativos com `aria-hidden` |
| 1.3.1 Info e relações | ✅ | `h1` por página, landmarks `nav`/`main` |
| 1.4.3 Contraste (mínimo) | ✅ | `--color-muted-foreground` → `#475569` (≥4.5:1) |
| 1.4.4 Redimensionar texto | ✅ | Overline mínimo 12px (`0.75rem`) |
| 2.1.1 Teclado | ✅ | Skip link, focus visible, tabs com `tabIndex` |
| 2.4.1 Bypass blocks | ✅ | `SkipToContent` → `#main-content` |
| 2.4.2 Título da página | ✅ | `PageTitleSync` por rota |
| 2.4.4 Finalidade do link | ✅ | Labels descritivos na navegação |
| 2.4.7 Foco visível | ✅ | `ring-2 ring-ring` em `:focus-visible` |
| 3.3.1 Identificação de erros | ✅ | `role="alert"` em formulários |
| 4.1.2 Nome, função, valor | ✅ | `aria-current`, `aria-sort`, `aria-selected` |

## Automatizado (CI)

```bash
npm run build
npm run e2e:install   # primeira vez
npm run e2e           # inclui a11y.spec.ts
```

Violações **critical** e **serious** do axe bloqueiam o pipeline.

## Pendências manuais (baixa prioridade)

- Teste com leitor de tela (NVDA/VoiceOver) em fluxo de conciliação
- Verificar contraste em tema escuro (`.dark`) se ativado no produto
