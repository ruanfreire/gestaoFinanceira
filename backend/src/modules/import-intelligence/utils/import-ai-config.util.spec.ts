import { describe, expect, it } from 'vitest';
import { isImportAiProviderReady, resolveImportAiProvider } from './import-ai-config.util';

const base = {
  importAiEnabled: true,
  explicitProvider: '',
  hasGroqKey: false,
  hasGeminiKey: false,
  ollamaEnabled: false,
};

describe('import-ai-config', () => {
  it('respeita IMPORT_AI_ENABLED=false', () => {
    expect(resolveImportAiProvider({ ...base, importAiEnabled: false, explicitProvider: 'groq' })).toBe(
      'none',
    );
  });

  it('usa IMPORT_AI_PROVIDER=groq quando habilitado', () => {
    expect(resolveImportAiProvider({ ...base, explicitProvider: 'groq', hasGroqKey: true })).toBe('groq');
  });

  it('usa IMPORT_AI_PROVIDER=ollama quando habilitado', () => {
    expect(resolveImportAiProvider({ ...base, explicitProvider: 'ollama' })).toBe('ollama');
  });

  it('usa IMPORT_AI_PROVIDER=gemini quando habilitado', () => {
    expect(resolveImportAiProvider({ ...base, explicitProvider: 'gemini' })).toBe('gemini');
  });

  it('auto-detecta groq antes de gemini', () => {
    expect(
      resolveImportAiProvider({ ...base, hasGroqKey: true, hasGeminiKey: true }),
    ).toBe('groq');
  });

  it('auto-detecta ollama quando OLLAMA_ENABLED=true', () => {
    expect(resolveImportAiProvider({ ...base, ollamaEnabled: true })).toBe('ollama');
  });

  it('verifica credenciais por provedor', () => {
    expect(isImportAiProviderReady('groq', { hasGroqKey: true, hasGeminiKey: false })).toBe(true);
    expect(isImportAiProviderReady('groq', { hasGroqKey: false, hasGeminiKey: true })).toBe(false);
    expect(isImportAiProviderReady('gemini', { hasGroqKey: false, hasGeminiKey: true })).toBe(true);
    expect(isImportAiProviderReady('ollama', { hasGroqKey: false, hasGeminiKey: false })).toBe(true);
  });
});
