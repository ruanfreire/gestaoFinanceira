# Feature: Confirmar recebimentos (`recebimentos`)

## Objetivo
Associar pagamentos bancários (Asaas/Nubank) às notas fiscais, conforme `docs/PRODUCT-SPEC.md` módulo 8.

## Rotas
- `/recebimentos` — pendentes de confirmação
- `/recebimentos/sem-correspondencia` — sem nota candidata

## APIs (inalteradas)
- `GET /extrato-asaas/pendentes`, `/extrato-nubank/pendentes`
- `GET /extrato-asaas/sem-match`, `/extrato-nubank/sem-match`
- `GET /extrato-{banco}/lancamentos/:id/notas?q=`
- `POST /extrato-{banco}/vincular`
- `POST /extrato-nubank/lancamentos/:id/pagador`
- `POST /notas/desvincular-pagamento` (undo)

## Hooks
- `useRecebimentosQuery` — lista por variant
- `useRecebimentosCounts` — badge no menu
- `useVincularMutation` — confirma vínculo
- `useConciliacaoUndo` — toast com desfazer

## Componentes
- `conciliation-queue.tsx` — fila lateral
- `movimento-panel.tsx` — painel de decisão + candidatas

## Design System
`SplitView`, `Sheet`, `MatchScore`, `Callout`, `ConfirmDialog`, `SegmentedTabs`
