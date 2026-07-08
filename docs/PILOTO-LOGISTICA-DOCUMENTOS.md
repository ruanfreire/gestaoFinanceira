# Piloto comercial — Logística documental (30 dias)

**Produto:** Fecho Document Core · vertical transporte  
**Proposta:** *“Jogue a pasta do dia — nós lemos os XMLs, ligamos aos pagamentos e você só confere.”*  
**Spec técnica:** `docs/connectors/CTE-PARSER.md`  
**Posicionamento:** `docs/POSITIONING-DOCUMENT-INTELLIGENCE.md`

---

## 1. Para quem é o piloto

### ICP ideal (transportadora pequena / média)

| Critério | Ideal | Desqualifica |
|----------|-------|--------------|
| Porte | 5–50 funcionários, 20–500 CT-e/mês | Enterprise com TMS integrado |
| Operação | Recebe XML de clientes; emite CT-e/MDF-e | Só carga própria sem documento |
| Dor | Digitação + conferência PIX + Excel | Já tem integração EDI completa |
| Stack atual | Excel, WhatsApp, emissor CT-e avulso | SAP/TOTVS com time de TI |
| Decisor | Sócio-operador ou gerente financeiro | Comitê TI 6 meses |

### Personas

| Persona | Dor | O que ganha no piloto |
|---------|-----|------------------------|
| **Sócio / dono** | Não sabe margem real por frete | Visão recebido vs emitido |
| **Financeiro** | Horas conferindo PIX | Match automático CT-e ↔ extrato |
| **Operacional** | Reenvio de XML, retrabalho | Menos digitação |

---

## 2. Proposta de valor (uma frase)

> **Eliminamos a digitação e a conferência manual entre CT-e, comprovantes e extrato bancário — em 30 dias você vê o fechamento do dia sem abrir Excel.**

### O que NÃO prometer no piloto

- Substituir emissor de CT-e
- Roteirização / app motorista
- TMS completo
- Emissão MDF-e automática

---

## 3. Escopo do piloto (30 dias)

### Incluído

| # | Entrega | Semana |
|---|---------|--------|
| 1 | Onboarding: CNPJ, conta, upload treinamento | S1 |
| 2 | Ingestão pasta/ZIP com XML CT-e (layout 3.00/4.00) | S1–S2 |
| 3 | Lista: chave, tomador, valor, status validação | S2 |
| 4 | Import extrato (CSV/OFX — Nubank, Asaas ou custom) | S2 |
| 5 | Match automático CT-e ↔ pagamento (score + confirmação) | S3 |
| 6 | Relatório: % auto-match, horas estimadas economizadas | S4 |
| 7 | Revisão conjunta + decisão go-live pago | S4 |

### Opcional (se cliente enviar)

- Parser NF-e XML vinculada à carga
- Export Excel do fechamento diário

### Fora do escopo

- Emissão CT-e/MDF-e
- Integração e-mail automática
- API para sistemas legados
- Multi-CNPJ / filiais

---

## 4. Cronograma semana a semana

```
Semana 1 — Setup
  Kickoff (1h)
  Coleta 20–50 XMLs reais anonimizados + 1 extrato
  Configuração tenant Fecho
  Primeiro upload → inventário documentos

Semana 2 — Leitura
  Parser CT-e em homologação
  Cliente valida: "estes campos estão certos?"
  Ajuste tomador / valor se necessário

Semana 3 — Conciliação
  Import extrato
  Match automático + fila "precisa confirmar"
  Cliente usa 3–5 dias na operação real

Semana 4 — Resultado
  Métricas: docs processados, % match, tempo
  Entrevista: "voltaria ao Excel?"
  Proposta assinatura pós-piloto
```

---

## 5. Métricas de sucesso

| Métrica | Meta piloto | Como medir |
|---------|-------------|------------|
| XMLs ingeridos sem digitação | ≥ 90% campos corretos | Amostra 20 CT-e |
| Tempo fechamento diário | −50% vs baseline | Pergunta semana 1 vs 4 |
| Match pagamento automático | ≥ 60% com score ≥ 80% | Sistema |
| NPS piloto | ≥ 8 | Survey final |
| Conversão pago | 1 assinatura | Contrato |

**Baseline semana 1:** perguntar quanto tempo gastam hoje em digitação + conferência (horas/dia).

---

## 6. Pricing sugerido (pós-piloto)

### Modelo híbrido (recomendado)

| Componente | Faixa | Notas |
|------------|-------|-------|
| **Base mensal** | R$ 297 – R$ 697 | Acesso plataforma + usuários |
| **Por documento** | R$ 0,15 – R$ 0,40 / CT-e processado | Escala com volume |
| **Setup** | Isento no piloto | R$ 500–1.500 em produção |

### Alternativa simples (PME)

| Plano | Preço | Incluso |
|-------|-------|---------|
| **Transporte Start** | R$ 497/mês | até 300 CT-e/mês + 1 extrato |
| **Transporte Pro** | R$ 997/mês | até 1.000 CT-e + match ilimitado |

**Piloto:** 30 dias gratuitos ou R$ 0 com compromisso de feedback + XMLs para treino.

---

## 7. Roteiro de abordagem (cold / warm)

### Mensagem curta (WhatsApp / LinkedIn)

```
Olá [nome], vi que vocês operam transporte em [cidade].

Uma dor comum: XML do cliente chega, alguém digita, emite CT-e, 
cai PIX e no fim do dia alguém fecha tudo no Excel.

Estamos pilotando um sistema que lê a pasta de XMLs, 
liga ao extrato e só pede confirmação — sem substituir seu emissor.

Topa 30 dias de piloto gratuito? Preciso de ~30 min na semana 1.
```

### Call de descoberta (15 min) — perguntas

1. Quantos CT-e por dia? De onde vêm os XMLs?
2. Quem digita hoje? Quanto tempo por dia?
3. Como sabem se o PIX bateu com o frete certo?
4. Qual emissor de CT-e usam? (integrar depois, não substituir)
5. O que acontece quando o XML vem errado?
6. Pagariam para eliminar a digitação? Quanto?

### Objeções comuns

| Objeção | Resposta |
|---------|----------|
| "Já temos emissor" | Não substituímos — lemos o que já chega e fechamos o financeiro |
| "Meu Excel funciona" | Funciona até quantos CT-e/dia? Quanto custa o erro? |
| "Não confio em automação" | Você confirma cada match; sistema só sugere |
| "É caro" | Quanto custa 2h/dia de funcionário digitando? |

---

## 8. Onboarding do design partner

### Checklist Fecho (interno)

- [ ] Criar org tenant + owner
- [ ] Coletar CNPJ emitente (validar CT-e próprios vs terceiros)
- [ ] Pasta segura para XMLs (Drive/S3) — **não usar produção sem LGPD**
- [ ] Termo piloto assinado (uso de dados, anonimização fixtures)
- [ ] Canal suporte (WhatsApp grupo 30 dias)
- [ ] Planilha métricas baseline

### Checklist cliente

- [ ] Enviar 20+ XMLs CT-e reais (podem anonimizar CNPJ se preferir)
- [ ] Enviar 1 extrato último mês (CSV/OFX)
- [ ] Indicar pessoa financeiro + operacional no piloto
- [ ] 30 min kickoff agendado
- [ ] Comprometer uso 3x/semana na semana 3

---

## 9. Termo de piloto (resumo)

Pontos mínimos:

1. **Duração:** 30 dias, renovação opcional.
2. **Gratuito** em troca de feedback estruturado e permissão de usar XMLs **anonimizados** em testes.
3. **Dados:** hospedagem Brasil; exclusão sob pedido; não revenda de dados.
4. **Sem SLA** de produção; ambiente piloto.
5. **Conversão:** proposta comercial ao final sem obrigação.

*(Jurídico formaliza versão definitiva.)*

---

## 10. Materiais de venda (a produzir)

| Material | Status |
|----------|--------|
| One-pager PDF "Fecho Transporte" | A fazer |
| Vídeo 2 min: arrasta pasta → match | Após D1c |
| Case piloto (nome + métricas) | Após 1º cliente |
| Landing `fecho.com.br/transporte` | A fazer |

---

## 11. Próximos passos imediatos

1. **Listar 10 transportadoras** no network (Seu Movimento, indicação, LinkedIn).
2. **Agendar 3 calls** de descoberta (15 min).
3. **Fechar 1 design partner** com kickoff em até 2 semanas.
4. **Paralelo técnico:** D1a parser CT-e (`CTE-PARSER.md`).

---

## 12. Referências internas

| Documento | Uso |
|-----------|-----|
| `docs/connectors/CTE-PARSER.md` | Spec ingestão CT-e |
| `docs/POSITIONING-DOCUMENT-INTELLIGENCE.md` | Narrativa produto |
| `docs/ROADMAP-MODULAR.md` | Fases D0–D8 |
| `docs/COMO-IMPORTAR-EXTRATO.md` | Extrato no piloto |
