import { z } from "zod";

export const tomadorSchema = z.object({
  nome: z.string().min(2, "Informe o nome do tomador"),
  documento: z.string().optional(),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
  codigo_servico_padrao: z.string().optional(),
  discriminacao_padrao: z.string().optional(),
  aliquota_iss_padrao: z.string().optional(),
  aliases_pagamento: z.string().optional(),
  endereco_logradouro: z.string().optional(),
  endereco_numero: z.string().optional(),
  endereco_bairro: z.string().optional(),
  endereco_cidade: z.string().optional(),
  endereco_uf: z.string().optional(),
  endereco_cep: z.string().optional(),
});

export type TomadorFormData = z.infer<typeof tomadorSchema>;

export function parseTomadorPayload(data: TomadorFormData) {
  const documento = data.documento?.replace(/\D/g, "") ?? "";
  const aliquotaRaw = data.aliquota_iss_padrao?.replace(",", ".").trim();
  const aliquota = aliquotaRaw ? Number.parseFloat(aliquotaRaw) : undefined;

  const aliases = (data.aliases_pagamento ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const enderecoEntries = {
    logradouro: data.endereco_logradouro?.trim(),
    numero: data.endereco_numero?.trim(),
    bairro: data.endereco_bairro?.trim(),
    cidade: data.endereco_cidade?.trim(),
    uf: data.endereco_uf?.trim(),
    cep: data.endereco_cep?.trim(),
  };
  const endereco = Object.fromEntries(
    Object.entries(enderecoEntries).filter(([, value]) => Boolean(value)),
  );

  return {
    nome: data.nome.trim(),
    documento: documento || undefined,
    email: data.email?.trim() || undefined,
    codigo_servico_padrao: data.codigo_servico_padrao?.trim() || undefined,
    discriminacao_padrao: data.discriminacao_padrao?.trim() || undefined,
    aliquota_iss_padrao: Number.isFinite(aliquota) ? aliquota : undefined,
    aliases_pagamento: aliases.length ? aliases : undefined,
    endereco: Object.keys(endereco).length ? endereco : undefined,
  };
}

export function tomadorToFormValues(tomador?: {
  nome?: string;
  documento?: string;
  email?: string;
  codigo_servico_padrao?: string;
  discriminacao_padrao?: string;
  aliquota_iss_padrao?: number;
  aliases_pagamento?: string[];
  endereco?: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
}): TomadorFormData {
  return {
    nome: tomador?.nome ?? "",
    documento: tomador?.documento ?? "",
    email: tomador?.email ?? "",
    codigo_servico_padrao: tomador?.codigo_servico_padrao ?? "",
    discriminacao_padrao: tomador?.discriminacao_padrao ?? "",
    aliquota_iss_padrao:
      tomador?.aliquota_iss_padrao != null ? String(tomador.aliquota_iss_padrao) : "",
    aliases_pagamento: (tomador?.aliases_pagamento ?? []).join(", "),
    endereco_logradouro: tomador?.endereco?.logradouro ?? "",
    endereco_numero: tomador?.endereco?.numero ?? "",
    endereco_bairro: tomador?.endereco?.bairro ?? "",
    endereco_cidade: tomador?.endereco?.cidade ?? "",
    endereco_uf: tomador?.endereco?.uf ?? "",
    endereco_cep: tomador?.endereco?.cep ?? "",
  };
}
