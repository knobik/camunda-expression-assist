/**
 * JUEL expression validator.
 * Uses the Peggy-generated parser for syntax checking and
 * cross-references variable names against known variables.
 */

import * as parser from './juelParser';

/**
 * Extract all Identifier nodes from a JUEL AST.
 * Only collects root-level identifiers (not property accesses after dots).
 */
function collectVariableRefs(node, refs = []) {
  if (!node || typeof node !== 'object') return refs;

  if (node.type === 'Identifier') {
    refs.push({ name: node.name, location: node.location });
  }

  if (node.type === 'MemberExpression' && !node.computed) {
    // For foo.bar — only 'foo' is a variable reference, 'bar' is a property
    collectVariableRefs(node.object, refs);
    // Skip node.property (it's a dot-access identifier, not a variable)
    return refs;
  }

  if (node.type === 'MemberExpression' && node.computed) {
    collectVariableRefs(node.object, refs);
    collectVariableRefs(node.property, refs);
    return refs;
  }

  if (node.type === 'CallExpression') {
    collectVariableRefs(node.callee, refs);
    if (node.arguments) {
      node.arguments.forEach(arg => collectVariableRefs(arg, refs));
    }
    return refs;
  }

  if (node.type === 'CompositeExpression' && node.parts) {
    node.parts.forEach(part => collectVariableRefs(part, refs));
    return refs;
  }

  // Walk known AST shapes
  for (const key of ['body', 'condition', 'consequent', 'alternate', 'left', 'right', 'argument']) {
    if (node[key]) collectVariableRefs(node[key], refs);
  }

  return refs;
}

// Well-known JUEL implicit objects and functions
const BUILTINS = new Set([
  // EL implicit objects
  'pageContext', 'pageScope', 'requestScope', 'sessionScope', 'applicationScope',
  'param', 'paramValues', 'header', 'headerValues', 'initParam', 'cookie',
  // Camunda-specific
  'execution', 'task', 'authenticatedUserId', 'currentUser', 'now',
  'dateTime', 'connector', 'S', 'XML', 'JSON',
  // Common Java types used in expressions
  'Math', 'Integer', 'Long', 'Double', 'String', 'Boolean',
  // SPIN
  'SPIN'
]);

/**
 * Validate a JUEL expression string.
 *
 * @param {string} value - The full field value (may contain ${...} or be plain text)
 * @param {Array} knownVariables - Array of { name: string } from VariableScanner
 * @returns {Array} - Array of { type: 'error'|'warning', message: string, location: object }
 */
export function validate(value, knownVariables = []) {
  const diagnostics = [];
  const knownNames = new Set(knownVariables.map(v => v.name));

  // Find all expression blocks in the value
  const exprPattern = /(\$\{|\#\{)/g;
  let match;

  while ((match = exprPattern.exec(value)) !== null) {
    const start = match.index;
    // Find matching closing brace
    let depth = 1;
    let pos = start + 2;
    let inStr = false;
    let strChar = null;

    while (pos < value.length && depth > 0) {
      const ch = value[pos];
      if (inStr) {
        if (ch === '\\') { pos++; }
        else if (ch === strChar) { inStr = false; }
      } else {
        if (ch === "'" || ch === '"') { inStr = true; strChar = ch; }
        else if (ch === '{') { depth++; }
        else if (ch === '}') { depth--; }
      }
      pos++;
    }

    if (depth !== 0) {
      diagnostics.push({
        type: 'error',
        message: 'Unclosed expression: missing }',
        offset: start
      });
      continue;
    }

    // Extract the full expression including delimiters
    const exprText = value.substring(start, pos);

    // Try to parse
    let ast;
    try {
      ast = parser.parse(exprText);
    } catch (e) {
      const msg = e.message || 'Syntax error';
      // Extract a cleaner message
      const cleanMsg = msg.includes('Expected')
        ? msg.substring(0, msg.indexOf('.') + 1) || msg
        : msg;

      diagnostics.push({
        type: 'error',
        message: cleanMsg,
        offset: start + (e.location ? e.location.start.offset : 2)
      });
      continue;
    }

    // Check variable references
    const refs = collectVariableRefs(ast);
    for (const ref of refs) {
      if (!knownNames.has(ref.name) && !BUILTINS.has(ref.name)) {
        diagnostics.push({
          type: 'warning',
          message: `Unknown variable: '${ref.name}'`,
          offset: start + (ref.location ? ref.location.start.offset : 2),
          variableName: ref.name
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Find the closest matching variable name for typo suggestions.
 */
export function findSimilar(name, knownVariables) {
  const threshold = Math.max(1, Math.floor(name.length * 0.4));
  let best = null;
  let bestDist = Infinity;

  for (const v of knownVariables) {
    const d = levenshtein(name.toLowerCase(), v.name.toLowerCase());
    if (d < bestDist && d <= threshold && d > 0) {
      bestDist = d;
      best = v.name;
    }
  }

  return best;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}
