import { describe, it, expect } from 'vitest';
import { validate, findSimilar } from '../src/JuelValidator.js';

const vars = [
  { name: 'assignee' },
  { name: 'orderId' },
  { name: 'amount' },
  { name: 'approved' },
  { name: 'customerName' },
  { name: 'jsonPayload' }
];

describe('JuelValidator.validate', () => {

  // --- Syntax validation ---

  describe('syntax validation', () => {

    it('should return no diagnostics for valid expression', () => {
      const result = validate('${assignee}', vars);
      expect(result).toHaveLength(0);
    });

    it('should return no diagnostics for plain text', () => {
      const result = validate('hello world', vars);
      expect(result).toHaveLength(0);
    });

    it('should return error for invalid syntax', () => {
      const result = validate('${foo +}', vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('error');
    });

    it('should return error for unclosed expression', () => {
      const result = validate('${foo', vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('error');
      expect(result[0].message).toContain('Unclosed expression');
    });

    it('should return error for unclosed string', () => {
      const result = validate("${'hello}", vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('error');
    });

    it('should return error for empty expression', () => {
      const result = validate('${}', vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('error');
    });

    it('should validate multiple expressions in one field', () => {
      // Both valid
      const result = validate('${assignee} and ${orderId}', vars);
      // Known bug: mixed text+expression fails at the parser Start level,
      // but validate() finds expressions by regex, so this may work differently.
      // The validator extracts ${...} blocks individually.
      expect(result.every(d => d.type !== 'error')).toBe(true);
    });
  });

  // --- Variable cross-reference ---

  describe('variable cross-reference', () => {

    it('should not warn for known variable', () => {
      const result = validate('${assignee}', vars);
      expect(result).toHaveLength(0);
    });

    it('should warn for unknown variable', () => {
      const result = validate('${unknownVar}', vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('warning');
      expect(result[0].message).toContain('Unknown variable');
      expect(result[0].message).toContain('unknownVar');
    });

    it('should not warn for builtins', () => {
      const builtins = ['execution', 'S', 'Math', 'task', 'now', 'XML', 'JSON'];
      for (const name of builtins) {
        const result = validate(`\${${name}}`, []);
        const warnings = result.filter(d => d.type === 'warning');
        expect(warnings).toHaveLength(0);
      }
    });

    it('should only check root variable in dot access', () => {
      // foo.bar — only 'foo' should be checked, 'bar' is a property
      const result = validate('${assignee.name}', vars);
      expect(result).toHaveLength(0);
    });

    it('should warn when root variable in dot access is unknown', () => {
      const result = validate('${unknown.name}', vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].message).toContain('unknown');
    });

    it('should check both operands in bracket access with variable', () => {
      // foo[bar] — both foo and bar are variable references
      const result = validate('${assignee[unknownKey]}', vars);
      const warnings = result.filter(d => d.type === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('unknownKey');
    });

    it('should not warn for bracket access with string literal', () => {
      const result = validate("${assignee['name']}", vars);
      expect(result).toHaveLength(0);
    });

    it('should check variables in binary expressions', () => {
      const result = validate('${amount > 100}', vars);
      expect(result).toHaveLength(0);
    });

    it('should warn for unknown variable in binary expression', () => {
      const result = validate('${unknownA + unknownB}', vars);
      const warnings = result.filter(d => d.type === 'warning');
      expect(warnings).toHaveLength(2);
    });

    it('should check variables in ternary', () => {
      const result = validate('${approved ? assignee : null}', vars);
      expect(result).toHaveLength(0);
    });

    it('should check variables in function call args', () => {
      const result = validate('${S(jsonPayload)}', vars);
      expect(result).toHaveLength(0);
    });

    it('should warn for unknown variable in function call args', () => {
      const result = validate('${S(unknownJson)}', vars);
      const warnings = result.filter(d => d.type === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('unknownJson');
    });

    it('should not warn for literals', () => {
      const result = validate("${true && false || null == 'hello'}", []);
      const warnings = result.filter(d => d.type === 'warning');
      expect(warnings).toHaveLength(0);
    });
  });

  // --- Deferred expressions ---

  describe('deferred expressions', () => {

    it('should validate #{...} the same as ${...}', () => {
      const result = validate('#{assignee}', vars);
      expect(result).toHaveLength(0);
    });

    it('should warn for unknown variable in deferred expression', () => {
      const result = validate('#{unknownVar}', vars);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('warning');
    });
  });
});

describe('JuelValidator.findSimilar', () => {

  it('should find close match', () => {
    const result = findSimilar('asignee', vars);
    expect(result).toBe('assignee');
  });

  it('should return null for case-only difference (not a typo)', () => {
    const result = findSimilar('Assignee', vars);
    // Case-only difference has Levenshtein distance 0 when lowercased
    expect(result).toBe(null);
  });

  it('should return null for exact match', () => {
    const result = findSimilar('assignee', vars);
    expect(result).toBe(null);
  });

  it('should return null when no close match', () => {
    const result = findSimilar('xyzzy', vars);
    expect(result).toBe(null);
  });

  it('should return closest match among multiple candidates', () => {
    const result = findSimilar('amout', vars);
    expect(result).toBe('amount');
  });

  it('should handle single character names', () => {
    const result = findSimilar('a', vars);
    // Too short to have a meaningful suggestion
    expect(result).toBe(null);
  });
});
