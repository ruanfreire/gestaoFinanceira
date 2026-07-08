# Guia operacional — Emissão de NF a partir de pagamento

**Público:** operador financeiro e admin da organização  
**Pré-requisito:** extrato importado e pagamentos em `sem_match` ou `pendente_vinculo`  
**Referência técnica:** `docs/FLUXO-EMISSAO-PAGAMENTO.md`

---

## Antes de começar

| Item | Onde configurar |
|------|-----------------|
| Tomadores com CPF/CNPJ | Configurações → Tomadores |
| Integração Honest (opcional) | Configurações → Integrações → Honest — **importação** |
| Emissão fiscal automática | Configurações → **Emissão NFS-e** (API da prefeitura) |

### Dois logins — não confundir

| Conta | Uso |
|-------|-----|
| E-mail/senha do **Gestão Financeira** | Entrar neste sistema (`/auth/entrar`) |
| E-mail/senha do **portal Honest** (`https://honest.com.br`) | Conectar a integração Honest |

São credenciais **diferentes**. Erro `HTTP 401` na Honest quase sempre indica login do portal incorreto.

Validar Honest no servidor:

```bash
cd backend
npm run test:honest
```

Deve retornar `OK — sessão obtida`.

---

## Fluxo diário recomendado

```
1. Importar extrato (Asaas/Nubank)
2. Confirmar recebimentos com match automático (fluxo principal)
3. Em "Pagamentos sem nota":
   a. Tentar vincular nota existente (fluxo atual), OU
   b. "Registrar nota para este recebimento" (novo fluxo)
4. Revisar análises e fluxo de caixa
```

O novo fluxo **não substitui** a conciliação. Só use quando o cliente pagou e a nota ainda não existe.

---

## Passo a passo — Registrar nota para um pagamento

### 1. Cadastrar tomadores (uma vez)

1. Configurações → **Tomadores**
2. Criar manualmente **ou** **Importar das notas** (extrai clientes das NFs já importadas)
3. Preencher: nome, CPF/CNPJ, código de serviço padrão, discriminação
4. Opcional: **apelidos** com nomes que aparecem no extrato (ex.: nome do Pix)

### 2. Identificar o pagamento

1. Recebimentos → aba **Sem nota** (ou alerta no Início)
2. Selecionar o pagamento na fila
3. Ver callout **“Cliente provável”** quando o sistema sugere um tomador

### 3. Wizard de emissão (3 passos)

1. **Tomador** — confirmar ou escolher outro
2. **Dados fiscais** — valor, código de serviço, discriminação, competência
3. **Confirmar** — grava nota e vincula o pagamento automaticamente

### 4. Resultado

| Modo | O que acontece |
|------|----------------|
| **Local** (emissão Honest desligada) | Nota com `PENDENTE_EMISSAO`, número `PEND-{timestamp}`; pagamento conciliado |
| **Honest** (flag ativa + integração OK) | **Não usado para emissão** — ver Emissão NFS-e |
| **Prefeitura** (emissão ativa + município configurado) | Transmite via API oficial; em implementação para SP |

Em ambos os casos o pagamento sai da fila e entra nas análises.

---

## Checklist semanal

- [ ] Extratos do período importados
- [ ] Fila de conciliação zerada ou justificada
- [ ] Tomadores novos cadastrados (clientes recorrentes)
- [ ] Notas `PENDENTE_EMISSAO` emitidas manualmente no portal Honest (se modo local)
- [ ] Fluxo de caixa exportado para o contador

---

## Problemas comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Botão de registrar nota não aparece | Pagamento já conciliado | Desvincular ou usar outro lançamento |
| “Tomador precisa de CPF/CNPJ” | Cadastro incompleto | Editar tomador em Configurações |
| Honest HTTP 401 ao conectar | Credencial do portal errada | Usar login de `honest.com.br`, não do app |
| Mutation `NfEmitir` falha | Canal Honest não emite mais — usar Emissão NFS-e ou modo local |
| Nota criada mas sem link prefeitura | Modo local ativo | Emitir manualmente no portal Honest |

---

## Produção (VM)

Variáveis no `.env` da VM — ver `docs/RELEASE-CHECKLIST.md`:

- `INTEGRATIONS_WORKER_ENABLED=true`
- `HONEST_KEYCLOAK_CLIENT_SECRET` (login sem navegador)
- `HONEST_BROWSER_LOGIN=false` em servidor sem Chromium

Após alterar `.env`: `sudo systemctl restart gestao-financeira-backend`

---

## Referências

| Documento | Conteúdo |
|-----------|----------|
| `docs/FLUXO-EMISSAO-PAGAMENTO.md` | Arquitetura e fases implementadas |
| `docs/HONEST-EMISSAO-API.md` | Mutation GraphQL experimental |
| `docs/BDRE.md` | Regras de conciliação (inalteradas) |
| `docs/RELEASE-CHECKLIST.md` | Gate de deploy |
