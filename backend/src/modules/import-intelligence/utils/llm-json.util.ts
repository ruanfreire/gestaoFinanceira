/** Extrai JSON de respostas LLM (Groq/Ollama às vezes envolvem em markdown). */
export function parseLlmJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Resposta vazia do LLM');

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error('JSON inválido na resposta do LLM');
  }
}
