# Como importar extrato bancário

Guia para importar extratos de bancos que não são Asaas ou Nubank.

## Onde importar

1. Acesse **Arquivos → Extratos**
2. Clique em **Outro banco**
3. Siga o assistente em 5 passos

## Formatos aceitos

| Formato | Análise | Importação |
|---------|---------|------------|
| CSV | Sim | Sim |
| JSON (transações) | Sim | Sim |
| JSON (notas fiscais) | Detecta e redireciona | Use **Arquivos → Notas** |
| PDF | Sim (sugere perfil) | Exporte CSV do banco |

## Passo a passo

### 1. Escolha a origem

- **Novo arquivo**: primeira vez com este banco
- **Perfil salvo**: reutiliza mapeamento de importação anterior

### 2. Envie o arquivo

Exporte o extrato do internet banking em CSV (recomendado) ou JSON.

### 3. Revise a análise

O sistema identifica automaticamente as colunas (data, valor, descrição, etc.). Ajuste se necessário.

- **Confiança alta (≥85%)**: geralmente pode importar direto
- **Confiança baixa**: revise o mapeamento antes de continuar

### 4. Confirme e importe

Informe o nome do banco e, opcionalmente, um nome para o perfil. O perfil é salvo para próximas importações.

### 5. Concilie recebimentos

Após importar, vá em **Recebimentos** para confirmar lançamentos que não foram vinculados automaticamente a notas.

## Dicas

- Prefira CSV com cabeçalho na primeira linha
- Valores negativos = saídas; positivos = entradas (regra padrão)
- O mesmo arquivo não pode ser importado duas vezes
- Limite diário de análises com IA: configurável em `IMPORT_AI_DAILY_LIMIT` (padrão 50)

## Métricas e uso de IA

Em **Configurações → Importação inteligente** você vê:

- Taxa de acerto prévia vs importação
- Uso de IA (chamadas, tokens estimados, limite diário)
- Sessões recentes de análise

## Suporte

Se o formato não for reconhecido, tente exportar CSV do banco ou entre em contato com o suporte informando o banco e um exemplo anonimizado do arquivo.
