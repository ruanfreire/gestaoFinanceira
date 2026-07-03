import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeCsvHeuristic, parseWithMapping } from '../services/heuristic-analyzer.service';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

describe('heuristic-analyzer fixtures', () => {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.csv'));

  it.each(files)('analisa e parseia %s', (fileName) => {
    const content = readFileSync(path.join(FIXTURES_DIR, fileName), 'utf-8');
    const result = analyzeCsvHeuristic(content, fileName);
    expect(result.overall_confidence).toBeGreaterThan(0.4);
    expect(result.detected_headers?.length).toBeGreaterThan(0);

    const { rows, errors } = parseWithMapping(content, result.mapping);
    expect(errors.length).toBe(0);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
