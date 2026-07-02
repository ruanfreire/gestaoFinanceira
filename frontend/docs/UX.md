# Guia de experiência — Gestão Financeira

**Última revisão:** 2026-07-02  
**Roadmap vivo:** `docs/ROADMAP-SAAS.md`

## Navegação

A interface segue a jornada do dinheiro:

1. **Início** — o que precisa da sua atenção hoje
2. **Minhas notas** — consultar, registrar e importar notas
3. **Confirmar recebimentos** — cruzar pagamentos do banco com notas
4. **Trazer dados** — enviar notas (JSON) e extratos (CSV)
5. **Análises** — situação das notas, fluxo de caixa (Excel), configurações de exportação

- Menu lateral (`AppShell`) com `aria-current="page"` na rota ativa
- Navegação mobile em barra inferior (`MobileNav`)
- **Command palette:** `Ctrl+K` / `⌘K` ou botão “Buscar” no header — atalho para qualquer tela
- **Pendentes no header:** chip “N aguardam confirmação” quando há recebimentos pendentes (desktop)
- Badge numérico no item “Confirmar recebimentos” no menu lateral e mobile

## Linguagem

| Evite (técnico) | Usamos |
|-----------------|--------|
| JSON | Arquivo de notas |
| Conciliação / Vínculo | Confirmar recebimentos |
| Sem match | Pagamentos sem nota |
| NF | Nota fiscal |

Rótulos de status em `@/lib/constants` (`CONCILIACAO_STATUS_LABELS`, `PAYMENT_STATUS_LABELS`).

## Tema claro / escuro

- Toggle sol/lua no header autenticado e na tela de login
- Preferência em `localStorage` (`gf.theme`)
- Tokens em `design-system/tokens.css` (classe `.dark` no `<html>`)

## Responsividade

- **Desktop:** `DataTable` com ordenação; `VirtualList` em filas longas (30+ itens); split view em notas e conciliação
- **Mobile:** cartões, `Sheet` na conciliação, FAB “Próximo”, barra inferior

## Acessibilidade (WCAG AA)

- `SkipToContent` no início de cada layout
- Títulos de página sincronizados (`PageTitleSync`)
- Contraste AA nos tokens (`design-system/tokens.css`)
- Auditoria automatizada: `npm run e2e` (axe-core)
- `prefers-reduced-motion` respeitado (sem fade-in no título do login)
- Focus trap no formulário de login

## Fluxos recomendados

### Início do dia
Início → resolver alertas → Confirmar recebimentos

### Importar notas
Enviar notas → (passo Inconsistências, se houver avisos) → histórico → Confirmar recebimentos

### Exportar fluxo de caixa
Análises → Fluxo de caixa → período de pagamento → (opcional) competência NF → banco → baixar Excel

O Excel pode incluir abas **Cartão de Crédito** e **Reembolso de despesas** quando houver lançamentos nessas categorias.
