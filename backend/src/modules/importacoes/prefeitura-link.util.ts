export function parsePrefeituraLink(link?: string) {
  if (!link?.trim()) return {};
  try {
    const url = new URL(link);
    return {
      prefeitura_ccm: url.searchParams.get('ccm') || undefined,
      prefeitura_cod_nf: url.searchParams.get('nf') || undefined,
      prefeitura_cod_verificacao: url.searchParams.get('cod') || undefined,
    };
  } catch {
    const ccm = link.match(/[?&]ccm=([^&]+)/)?.[1];
    const nf = link.match(/[?&]nf=([^&]+)/)?.[1];
    const cod = link.match(/[?&]cod=([^&]+)/)?.[1];
    return {
      prefeitura_ccm: ccm,
      prefeitura_cod_nf: nf,
      prefeitura_cod_verificacao: cod,
    };
  }
}
