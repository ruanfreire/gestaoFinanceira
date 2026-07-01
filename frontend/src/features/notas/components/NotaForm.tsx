import { FormEvent, useState } from "react";
import Label from "@ui/components/form/Label";
import Input from "@ui/components/form/input/InputField";
import Alert from "@ui/components/ui/alert/Alert";
import Button from "@ui/components/ui/button/Button";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useCreateNotaMutation } from "../hooks/useNotaMutations";
import type { CreateNotaPayload } from "../types/nota.types";

type FormErrors = Partial<Record<"empresa" | "numero" | "valor", string>>;

function parseValor(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function validate(empresa: string, numero: string, valor: string): FormErrors {
  const errors: FormErrors = {};
  if (!empresa.trim()) errors.empresa = "Informe a empresa";
  if (!numero.trim()) errors.numero = "Informe o número da nota";
  const parsed = parseValor(valor);
  if (parsed == null || parsed <= 0) errors.valor = "Informe um valor maior que zero";
  return errors;
}

type NotaFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function NotaForm({ onSuccess, onCancel }: NotaFormProps) {
  const toast = useToast();
  const mutation = useCreateNotaMutation();

  const [empresa, setEmpresa] = useState("");
  const [numero, setNumero] = useState("");
  const [valor, setValor] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(empresa, numero, valor);
    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) return;

    const parsedValor = parseValor(valor);
    if (parsedValor == null) return;

    const payload: CreateNotaPayload = {
      empresa: empresa.trim(),
      numero: numero.trim(),
      valor: parsedValor,
      data_emissao: new Date().toISOString(),
      status: "emitida",
    };

    try {
      await mutation.mutateAsync(payload);
      toast.showToast({ variant: "success", title: "Nota cadastrada com sucesso." });
      onSuccess();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Erro ao salvar nota");
      setSubmitError(msg);
      toast.showToast({ variant: "error", title: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <Label htmlFor="empresa">Empresa</Label>
        <Input
          id="empresa"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Nome ou código"
          error={Boolean(errors.empresa)}
        />
        {errors.empresa && <p className="mt-1 text-sm text-error-500">{errors.empresa}</p>}
      </div>

      <div>
        <Label htmlFor="numero">Número</Label>
        <Input
          id="numero"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Número da nota"
          error={Boolean(errors.numero)}
        />
        {errors.numero && <p className="mt-1 text-sm text-error-500">{errors.numero}</p>}
      </div>

      <div>
        <Label htmlFor="valor">Valor (R$)</Label>
        <Input
          id="valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          error={Boolean(errors.valor)}
        />
        {errors.valor && <p className="mt-1 text-sm text-error-500">{errors.valor}</p>}
      </div>

      {submitError && <Alert variant="error" title="Não foi possível salvar" message={submitError} />}

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
