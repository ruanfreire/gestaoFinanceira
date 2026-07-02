import { describe, expect, it } from 'vitest';
import { hashJsonValue, hashTextContent } from './content-hash.util';

describe('content-hash.util', () => {
  it('produz o mesmo hash para JSON equivalente', () => {
    const a = hashJsonValue({ data: [{ empresa: [{ nf_lista: [] }] }] });
    const b = hashJsonValue({ data: [{ empresa: [{ nf_lista: [] }] }] });
    expect(a).toBe(b);
  });

  it('normaliza quebras de linha no CSV', () => {
    expect(hashTextContent('a,b\r\nc')).toBe(hashTextContent('a,b\nc'));
  });
});
