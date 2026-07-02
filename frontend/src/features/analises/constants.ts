export const FLUXO_DEFAULTS_STORAGE_KEY = "gf.analises.fluxo-defaults";

export type FluxoDefaults = {
  empresaNome: string;
  empresaCnpj: string;
  contaCorrente: string;
  saldoInicial: string;
};

export const EMPTY_FLUXO_DEFAULTS: FluxoDefaults = {
  empresaNome: "",
  empresaCnpj: "",
  contaCorrente: "",
  saldoInicial: "",
};
