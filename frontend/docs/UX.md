# Guia de experiência — Gestão Financeira

## Navegação

A interface está organizada pela jornada do dinheiro:

1. **Central de atenção** — o que precisa da sua atenção agora
2. **Notas fiscais** — consultar, registrar e importar notas
3. **Pagamentos do banco** — importar extratos CSV
4. **Cruzar pagamentos** — associar pagamentos às notas
5. **Relatórios** — gerar relatórios e exportar planilhas

## Atalhos de teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+K` | Abrir busca rápida (Command Palette) |
| `Ctrl+Enter` | Confirmar vínculo na tela de cruzamento |
| `j` / `k` | Navegar itens na fila de cruzamento |

## Linguagem

O sistema usa termos simples em português. O glossário oficial está em `frontend/src/shared/copy/glossary.ts`.

| Evite (técnico) | Usamos |
|-----------------|--------|
| JSON | Arquivo de notas |
| Conciliação / Vínculo | Cruzar pagamentos |
| Sem match | Sem correspondência |
| NF | Nota fiscal |

## Responsividade

- **Desktop:** tabelas completas e painéis laterais (Sheet)
- **Mobile:** listas em cartões, menu em drawer, filtros compactos

## Acessibilidade

- Navegação por teclado em modais, sheets e combobox
- Foco visível em botões e campos
- Labels em ícones de ação quando necessário
- Mensagens de erro em linguagem clara

## Fluxos recomendados

### Início do dia
Central de atenção → resolver pendências → cruzar pagamentos

### Importar notas
Importar arquivo → conferir resumo → ver histórico → cruzar pagamentos

### Importar extrato
Escolher banco → enviar CSV → revisar lançamentos → cruzar pagamentos
