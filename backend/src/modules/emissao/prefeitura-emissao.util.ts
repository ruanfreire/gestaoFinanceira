export function mapPrefeituraEmitErrorMessage(error?: string): string {
  const message = (error ?? '').toLowerCase();
  if (!message) return 'Não foi possível emitir a nota fiscal na prefeitura.';
  if (message.includes('documento') || message.includes('cpf') || message.includes('cnpj')) {
    return 'Documento do tomador inválido ou ausente. Revise o cadastro do tomador.';
  }
  if (message.includes('servico') || message.includes('serviço') || message.includes('codigo')) {
    return 'Código de serviço não reconhecido pela prefeitura. Ajuste o serviço padrão do tomador.';
  }
  if (message.includes('ccm') || message.includes('inscrição') || message.includes('inscricao')) {
    return 'Inscrição municipal (CCM) não configurada. Revise os dados fiscais da organização.';
  }
  if (message.includes('certificado') || message.includes('a1')) {
    return 'Certificado digital A1 não configurado para emissão na prefeitura.';
  }
  return error ?? 'Não foi possível emitir a nota fiscal na prefeitura.';
}
