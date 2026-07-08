import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { WizardTemplate } from "@/design-system/templates";
import { ChoiceCardGrid, ChoiceCard, TaskGuide, StepHint, PrefetchLink } from "@/design-system/molecules";
import { Button, Typography } from "@/design-system/atoms";
import { ROUTES } from "@/lib/constants";
import { configuracoesCopy } from "@/shared/copy/pt-BR";

const STEPS = [
  { id: "banco", label: "Banco" },
  { id: "formato", label: "Formato" },
  { id: "teste", label: "Teste" },
];

const BANKS = ["Itaú", "Bradesco", "Nubank", "Santander", "Outro"];

export default function ConfiguracoesBancoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [banco, setBanco] = useState<string | null>(null);
  const [formato, setFormato] = useState<string | null>(null);

  const goImport = () => navigate(ROUTES.financeiroEnviarExtrato);

  return (
    <WizardTemplate
      title={configuracoesCopy.banco.wizardTitle}
      description={configuracoesCopy.banco.description}
      steps={STEPS}
      currentStep={step}
      taskGuide={
        <TaskGuide
          goal="Configurar envio de extrato"
          steps={["Escolha o banco", "Como você envia", "Teste com um arquivo"]}
          minutes={3}
          currentStep={step}
        />
      }
      stepHint={<StepHint>{STEPS[step]?.label}</StepHint>}
    >
      {step === 0 && (
        <>
          <Typography variant="subtitle">{configuracoesCopy.banco.stepBanco}</Typography>
          <ChoiceCardGrid className="mt-4">
            {BANKS.map((name) => (
              <ChoiceCard
                key={name}
                title={name}
                selected={banco === name}
                onClick={() => setBanco(name)}
              />
            ))}
          </ChoiceCardGrid>
          <WizardTemplate.Footer>
            <Button variant="outline" asChild>
              <PrefetchLink to={ROUTES.configuracoes}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </PrefetchLink>
            </Button>
            <Button disabled={!banco} onClick={() => setStep(1)}>
              Continuar
            </Button>
          </WizardTemplate.Footer>
        </>
      )}

      {step === 1 && (
        <>
          <Typography variant="subtitle">{configuracoesCopy.banco.stepFormato}</Typography>
          <ChoiceCardGrid className="mt-4">
            {["Arquivo do internet banking", "E-mail automático"].map((name) => (
              <ChoiceCard
                key={name}
                title={name}
                selected={formato === name}
                onClick={() => setFormato(name)}
              />
            ))}
            <ChoiceCard
              title="Conexão automática"
              description="Em breve"
              selected={false}
              onClick={() => {}}
              className="opacity-60"
            />
          </ChoiceCardGrid>
          <WizardTemplate.Footer>
            <Button variant="outline" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button disabled={!formato} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </WizardTemplate.Footer>
        </>
      )}

      {step === 2 && (
        <>
          <Typography variant="subtitle">{configuracoesCopy.banco.stepTeste}</Typography>
          <Typography variant="body" tone="muted" className="mt-2">
            Banco: <strong>{banco}</strong> · Formato: <strong>{formato}</strong>
          </Typography>
          <Typography variant="body" className="mt-4">
            Na próxima tela, arraste um extrato de exemplo. O sistema aprende o formato automaticamente.
          </Typography>
          <WizardTemplate.Footer>
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={goImport}>Enviar extrato de teste</Button>
          </WizardTemplate.Footer>
        </>
      )}
    </WizardTemplate>
  );
}
