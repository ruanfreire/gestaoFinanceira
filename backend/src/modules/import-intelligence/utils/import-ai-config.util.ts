export type ImportAiProvider = 'none' | 'gemini' | 'groq' | 'ollama';

export type ImportAiEnvConfig = {
  importAiEnabled: boolean;
  explicitProvider: string;
  hasGroqKey: boolean;
  hasGeminiKey: boolean;
  ollamaEnabled: boolean;
};

/** Resolve provedor de IA conforme variáveis do .env (groq | ollama | gemini | none). */
export function resolveImportAiProvider(config: ImportAiEnvConfig): ImportAiProvider {
  if (!config.importAiEnabled) return 'none';

  const explicit = config.explicitProvider.trim().toLowerCase();
  if (explicit === 'none' || explicit === 'heuristic') return 'none';
  if (explicit === 'gemini' || explicit === 'groq' || explicit === 'ollama') {
    return explicit;
  }

  if (config.hasGroqKey) return 'groq';
  if (config.hasGeminiKey) return 'gemini';
  if (config.ollamaEnabled) return 'ollama';
  return 'none';
}

export function isImportAiProviderReady(
  provider: ImportAiProvider,
  config: Pick<ImportAiEnvConfig, 'hasGroqKey' | 'hasGeminiKey'>,
): boolean {
  if (provider === 'none') return false;
  if (provider === 'gemini') return config.hasGeminiKey;
  if (provider === 'groq') return config.hasGroqKey;
  return true;
}
