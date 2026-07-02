import { ROUTES } from "@/lib/constants";

export type ScreenTask = {
  goal: string;
  steps: ReadonlyArray<string>;
  minutes: number;
};

/** Copy orientado à tarefa — cada tela deve ser concluível em ≤3 min sem manual */
export const screenTasks: Record<string, ScreenTask> = {
  entrar: {
    goal: "Entrar no sistema com seu e-mail e senha",
    steps: ["Digite o e-mail cadastrado", "Digite sua senha", "Toque em Entrar"],
    minutes: 1,
  },
  home: {
    goal: "Ver o que precisa da sua atenção e agir",
    steps: ["Leia o aviso no topo", "Toque no botão da ação sugerida", "Conclua a tarefa indicada"],
    minutes: 1,
  },
  notas: {
    goal: "Encontrar uma nota ou registrar uma nova",
    steps: ["Use a busca se souber o número ou tomador", "Toque na nota para ver pagamentos", "Ou registre uma nota manualmente"],
    minutes: 2,
  },
  notaNova: {
    goal: "Registrar uma nota fiscal manualmente",
    steps: ["Preencha empresa, número e data", "Informe o valor em reais", "Toque em Registrar nota"],
    minutes: 2,
  },
  recebimentos: {
    goal: "Associar cada pagamento bancário à nota fiscal correta",
    steps: ["Veja a sugestão do sistema", "Escolha outra nota se precisar", "Toque em Confirmar recebimento"],
    minutes: 3,
  },
  arquivosNotas: {
    goal: "Enviar o arquivo com suas notas fiscais",
    steps: ["Escolha o arquivo exportado do seu sistema", "Confira a pré-visualização", "Envie e veja o resultado"],
    minutes: 2,
  },
  arquivosExtratos: {
    goal: "Enviar o extrato do seu banco",
    steps: ["Escolha Asaas ou Nubank", "Selecione o arquivo CSV", "Confira e importe"],
    minutes: 2,
  },
  arquivosHistorico: {
    goal: "Consultar uma importação anterior",
    steps: ["Escolha a aba Notas ou Extratos", "Toque na importação desejada", "Veja detalhes ou baixe o arquivo"],
    minutes: 1,
  },
  analisesSituacao: {
    goal: "Ver quanto foi emitido e recebido no período",
    steps: ["O período já vem preenchido", "Confira o resumo", "Exporte o CSV se precisar"],
    minutes: 2,
  },
  analisesFluxo: {
    goal: "Baixar o relatório de fluxo de caixa em Excel",
    steps: ["Escolha o período", "Escolha o banco", "Baixe o Excel"],
    minutes: 2,
  },
  analisesConfig: {
    goal: "Salvar dados padrão para exportações de fluxo de caixa",
    steps: ["Preencha empresa e conta", "Toque em Salvar padrões", "Use no wizard de fluxo de caixa"],
    minutes: 1,
  },
};

export const journeyNextSteps = {
  afterNotasImport: {
    title: "Próximo passo",
    description: "Envie o extrato do banco para o sistema associar os pagamentos automaticamente.",
    actionLabel: "Enviar extrato bancário",
    actionTo: ROUTES.arquivosExtratos,
  },
  afterExtratoImport: {
    title: "Próximo passo",
    description: "Alguns pagamentos podem precisar da sua confirmação. Leva poucos minutos.",
    actionLabel: "Confirmar recebimentos",
    actionTo: ROUTES.recebimentos,
  },
  afterConciliacao: {
    title: "Tudo certo por aqui",
    description: "Veja o resumo financeiro do período nas análises.",
    actionLabel: "Ver situação das notas",
    actionTo: ROUTES.analisesSituacao,
  },
} as const;
