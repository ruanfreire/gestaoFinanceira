import { describe, expect, it } from 'vitest';
import { parseLlmJsonResponse } from './llm-json.util';

describe('parseLlmJsonResponse', () => {
  it('parseia JSON puro', () => {
    expect(parseLlmJsonResponse('{"items":[]}')).toEqual({ items: [] });
  });

  it('remove cercas markdown', () => {
    expect(parseLlmJsonResponse('```json\n{"items":[{"id":"1"}]}\n```')).toEqual({
      items: [{ id: '1' }],
    });
  });

  it('extrai objeto embutido em texto', () => {
    expect(parseLlmJsonResponse('Aqui está: {"items":[]} fim')).toEqual({ items: [] });
  });
});
