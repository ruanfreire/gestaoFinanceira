# Especificação de Produto — Gestão Financeira SaaS

**Agente 01 — Head of Product**  
**Aprovado para implementação por:** Chief Architect  
**Restrição:** zero alteração em regras de negócio (`docs/BDRE.md`)

---

## Arquitetura da informação (proposta)

### Menu por jornada (não por técnica)

```
INÍCIO                    → Central operacional
MINHAS NOTAS              → Consulta + registro manual
CRUZAR PAGAMENTOS         → Conciliação (módulo crítico)
TRAZER DADOS              → Notas JSON · Extrato CSV · Histórico
ANÁLISES                  → Situação · Fluxo de caixa
```

### Renomeações UX Writing (implementar gradualmente)

| Atual | Proposto |
|-------|----------|
| Cruzar pagamentos | Confirmar recebimentos |
| Sem correspondência | Pagamentos sem nota |
| Trazer notas | Enviar notas |
| Trazer extrato | Enviar extrato bancário |
| Aguardando escolha | Precisa da sua confirmação |

---

# MÓDULO 1 — Autenticação (`/auth/entrar`)

## 1. Objetivo
Permitir acesso seguro sem fricção para operadores financeiros.

## 2. Jornada
Chega via URL ou redirect → preenche e-mail/senha → entra no Início.

## 3. Problemas atuais
- OK funcional; falta link "esqueci senha" (fora de escopo API).
- Toggle senha sem hint para leitores de tela no primeiro uso.

## 4. Melhorias
- Manter `TaskGuide`; adicionar mensagem de boas-vindas na primeira sessão (Fase 10).

## 5. IA
Tela única, sem menu lateral.

## 6. Fluxo
E-mail → Senha → [Lembrar] → Entrar → Início

## 7. Wireframe
```
+------------------------------------------+
|  [logo] Gestão Financeira                |
|  Entrar                                  |
|  Use o e-mail cadastrado pelo admin      |
|  +------------------------------------+  |
|  | Guia: 3 passos · ~1 min            |  |
|  +------------------------------------+  |
|  E-mail [____________]                   |
|  Senha  [____________] [olho]            |
|  [ ] Lembrar e-mail                      |
|  [      Entrar      ]                    |
|  Precisa de ajuda? Fale com o admin.     |
+------------------------------------------+
```

## 8. UX Writing
- Erro: "E-mail ou senha incorretos. Tente novamente."
- Loading: botão "Entrando..."

## 9. Usabilidade
Usuário leigo conclui em < 60s sem documentação.

## 10. Aceitação
- [ ] Validação inline e-mail
- [ ] Erro amigável
- [ ] Focus trap no formulário
- [ ] Redirect pós-login preserva destino

---

# MÓDULO 2 — Início / Dashboard (`/`)

## 1. Objetivo
Responder em 5s: como está a operação e o que fazer agora.

## 2. Jornada
Primeira tela pós-login; retorno diário; clique em alertas.

## 3. Problemas
- KPIs sem contexto de período visível o suficiente.
- Alertas bons; falta contador de conciliações no header global.

## 4. Melhorias
- Badge no menu "Confirmar recebimentos (N)" — **Agente 02, Fase 7**.
- Ordenar alertas por urgência: conciliação > importação falha > informativo.

## 5. IA
Início | Notas | Recebimentos | Trazer dados ▾ | Análises ▾

## 6. Fluxo
Carrega → lê alertas → ação rápida OU filtra período → vê KPIs → timeline

## 7. Wireframe
```
+--------+----------------------------------------+
| Nav    | Início                                 |
|        | [Guia tarefa]                          |
|        | ! ALERTA: 12 pagamentos aguardam     |
|        | [Trazer notas][Trazer extrato][...]    |
|        | Período [mês atual]                    |
|        | Emitido | Recebido | Em aberto         |
|        | Atividade recente | Movimentos pendentes|
+--------+----------------------------------------+
```

## 8. UX Writing
- Empty timeline: "Nenhuma atividade recente. Envie notas ou extrato para começar."
- KPI em aberto: tooltip "Valor das notas ainda não totalmente recebidas."

## 9–10. Aceitação
- [ ] Skeleton no load
- [ ] Retry em erro
- [ ] Cada alerta com CTA
- [ ] Mobile: cards empilhados, ações rápidas acessíveis

---

# MÓDULO 3 — Minhas Notas (`/notas`)

## 1. Objetivo
Encontrar qualquer nota e ver situação de pagamento.

## 2. Jornada
Menu → busca/filtro → clique linha → painel detalhe → opcional desvincular.

## 3. Problemas
- Modal em vez de painel lateral fixo no desktop (aceito, melhorar para Drawer).
- Sem ordenação por coluna.
- Sem export da lista (API extracao existe em outro módulo).

## 4. Melhorias
- **Desktop:** `SplitView` lista + detalhe (Fase 4 Notas).
- Manter `ConfirmDialog` no desvincular.

## 5–7. Wireframe desktop alvo
```
+--------+----------------------------------------+
| Nav    | Minhas notas          [+ Registrar]    |
|        | [busca________________]              |
|        | +Lista----+ +-- Detalhe NF 408 -----+|
|        | | NF 408  | | Valor · Status        ||
|        | | NF 407  | | Pagamentos vinculados ||
|        +-----------+ +------------------------+|
+--------+----------------------------------------+
```

## 8. UX Writing
- Empty: "Nenhuma nota ainda. Envie suas notas ou registre uma manualmente."
- Desvincular: "O pagamento voltará a ficar pendente de confirmação."

## 10. Aceitação
- [ ] Busca debounced
- [ ] Paginação
- [ ] Mobile cards
- [ ] Confirmação antes de desvincular

---

# MÓDULO 4 — Registrar Nota (`/notas/nova`)

## 1. Objetivo
Cadastro manual pontual sem importação.

## 2–6. Fluxo
Form simples 4 campos → validar → toast sucesso → redireciona lista

## 7. Wireframe
Formulário único com `FormGroup` + ajuda por campo.

## 8. UX Writing
- Valor: placeholder "Ex.: 1.234,56"
- Erro API: "Não foi possível salvar a nota. Confira os dados e tente de novo."

## 10. Aceitação
- [ ] Zod + mensagens por campo
- [ ] Cancelar volta à lista

---

# MÓDULO 5 — Enviar Notas JSON (`/arquivos/notas`)

## 1. Objetivo
Importar lote de NFs sem conhecer formato JSON.

## 2. Jornada
Menu Trazer dados → wizard 4 passos → resultado → próximo passo extrato

## 3. Problemas
- Usuário vê palavra "JSON" — trocar por "arquivo de notas exportado do seu sistema".
- Passo correções (inconsistências) não existe como passo dedicado.

## 4. Melhorias
- Inserir passo "Conferir" com linguagem: "Encontramos X notas de Y empresas".
- Erro estrutura: listar o que falta em bullets, não código.

## 6. Fluxo alvo (7 passos missão)
Arquivo → Validar → Prévia → Inconsistências (se houver) → Enviar → Resultado → Próximo passo

## 8. UX Writing
- Aceitar: ".json"
- Hint: "Exporte do mesmo sistema que você usa para emitir notas."
- Sucesso: "Importação concluída: X novas, Y atualizadas."

## 10. Aceitação
- [ ] Wizard com indicador de passo
- [ ] `ErrorState` em arquivo inválido
- [ ] `NextStepBanner` pós-sucesso

---

# MÓDULO 6 — Enviar Extrato (`/arquivos/extratos`)

## 1. Objetivo
Importar CSV Asaas ou Nubank com confiança.

## 3. Problemas
- Usuário pode não saber qual banco — adicionar ajuda "Como identificar?".

## 4. Melhorias
- `ChoiceCard` Asaas/Nubank com ícone e exemplo de nome de arquivo.
- Após import: mostrar em linguagem humana: "X recebidos automaticamente, Y aguardam você."

## 8. UX Writing
- Asaas: "Extrato do Asaas (cobranças e recebimentos)"
- Nubank: "Extrato da conta Nubank"

---

# MÓDULO 7 — Histórico (`/arquivos/historico`)

## 1. Objetivo
Auditar importações passadas.

## 4. Melhorias
- Cards em vez de tabela — **já implementado**.
- Filtro por data (Fase 5, somente UI sobre API list existente).

---

# MÓDULO 8 — Confirmar Recebimentos (`/recebimentos`) ⭐ CRÍTICO

## 1. Objetivo
Vincular pagamentos bancários às notas com mínimo esforço.

## 2. Jornada
Alerta no Início → fila à esquerda → detalhe à direita → confirma → próximo

## 3. Problemas resolvidos (Fase 4 parcial)
- Split view desktop ✅
- MatchScore ✅
- Sheet mobile ✅
- Atalhos j/k ✅

## 3. Problemas remanescentes
- Mobile: usuário precisa tocar item para abrir sheet (OK, melhorar onboarding).
- Falta FAB "Próximo pendente" no mobile.
- Undo na própria tela (hoje só em notas).

## 4. Melhorias próximas (APROVADO Agente 02)
- Badge confiança com cor semântica (verde ≥80%, amarelo ≥50%).
- Tecla `Enter` confirma quando foco não está em input.
- Snackbar com "Desfazer" 5s após confirmar (usa API desvincular existente).

## 7. Wireframe desktop
```
+--------+----------------------------------------+
| Nav    | Confirmar recebimentos                 |
|        | [Precisa confirmação | Sem nota]       |
|        | +--Fila---+ +-- Pagamento R$ 689,10 --+|
|        | |68% Marta| | Notas candidatas        ||
|        | |  NF...  | | [====] 92% NF 399       ||
|        | +---------+ | [Confirmar]             ||
+--------+----------------------------------------+
```

## 8. UX Writing
- Título painel: "Qual nota corresponde a este pagamento?"
- Score: "Compatibilidade com a nota"
- Pix sem nome: "Quem fez este pagamento?"

## 10. Aceitação
- [ ] Fila sempre visível desktop
- [ ] Uma decisão por vez
- [ ] Confirmação modal antes de vincular
- [ ] Busca instantânea candidatas
- [ ] WCAG: radiogroup nas notas

---

# MÓDULO 9 — Pagamentos sem nota (`/recebimentos/sem-correspondencia`)

## 1. Objetivo
Tratar recebimentos que o sistema não associou automaticamente.

## 4. Melhorias
- Mesma UI do módulo 8; copy diferente.
- Empty state celebratório: "Todos os pagamentos estão associados às notas."

---

# MÓDULO 10 — Situação das notas (`/analises/situacao`)

## 1. Objetivo
Resumo emitido × recebido × em aberto no período.

## 4. Melhorias
- Trocar lista de cards por tabela apenas se usuário pedir "ver todas" (accordion).
- Export CSV com toast "Arquivo salvo na pasta de downloads."

---

# MÓDULO 11 — Fluxo de caixa (`/analises/fluxo-caixa`)

## 1. Objetivo
Gerar Excel contábil em 3 passos.

## 4. Melhorias
- Campos opcionais Asaas: manter em accordion (complexidade no sistema).
- Último passo: resumo legível antes de baixar.

---

# MÓDULO 12 — 404

## 1. Objetivo
Recuperar usuário perdido.

## 8. UX Writing
- "Esta página não existe."
- CTA: "Voltar ao início"

---

# Critérios globais de aceitação (DoD Produto)

- [ ] Usuário leigo conclui jornada completa: notas → extrato → conciliação → relatório
- [ ] Nenhum termo JSON/XML/API na UI principal
- [ ] Todo fluxo termina com próximo passo sugerido
- [ ] WCAG AA em auditoria formal (Fase 10)
- [ ] Regras BDRE intactas (Agente 03 sign-off)
