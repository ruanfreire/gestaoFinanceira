# Feature: Minhas notas (`notas`)

## Objetivo
Consultar notas fiscais, ver detalhes de pagamentos vinculados e registrar notas manualmente.

## Rotas
- `/notas` — listagem com split view (desktop) e cards + modal (mobile)
- `/notas/nova` — registro manual

## APIs (inalteradas)
- `GET /notas` — listagem paginada
- `GET /notas/:id` — detalhe (via listagem)
- `POST /notas` — registro manual
- `POST /notas/desvincular-pagamento` — desfazer vínculo

## Hooks
- `useNotasQuery` — listagem com busca e paginação
- `useDesvincularMutation` — desvincular pagamento

## Componentes
- `notas-queue.tsx` — fila lateral (desktop)
- `nota-detail-panel.tsx` — painel de detalhe

## Design System
`ListTemplate`, `SplitView`, `DataTable`, `Modal`, `ConfirmDialog`, `SearchInput`, `Pagination`

## Responsividade
- **Desktop (lg+):** `SplitView` com fila + painel de detalhe
- **Mobile:** `DataTable` em cards + `Modal` para detalhe
