import { z } from "zod";

export const notaSchema = z.object({
  empresa: z.string().min(1, "Informe a empresa"),
  numero: z.string().min(1, "Informe o número da nota"),
  data_emissao: z.string().min(1, "Informe a data de emissão"),
  valor: z.string().min(1, "Informe o valor").refine((v) => {
    const n = Number.parseFloat(v.replace(/\./g, "").replace(",", "."));
    return !Number.isNaN(n) && n > 0;
  }, "Valor deve ser maior que zero"),
});

export type NotaFormData = z.infer<typeof notaSchema>;
