# Feature: Análises (`analises`)

## Rotas
- `/analises/situacao` — resumo emitido × recebido × em aberto
- `/analises/fluxo-caixa` — wizard Excel fluxo de caixa
- `/analises/configuracoes` — padrões locais de exportação (localStorage)

## APIs (inalteradas)
- `GET /notas/extracao` — situação das notas
- `GET /relatorios/exportacao-fluxo-caixa` — Excel fluxo de caixa

## Componentes
- `situacao-notas-table.tsx` — tabela paginada (accordion "ver todas")

## Hooks
- `use-fluxo-defaults.ts` — persistência de campos opcionais do export
