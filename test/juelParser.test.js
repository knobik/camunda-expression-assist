import { describe, it, expect } from 'vitest';
import * as parser from '../src/juelParser.js';

describe('JUEL Parser', () => {

  // --- Valid expressions ---

  describe('valid expressions', () => {

    it('should parse simple variable', () => {
      const ast = parser.parse('${foo}');
      expect(ast.type).toBe('DynamicExpression');
      expect(ast.body.type).toBe('Identifier');
      expect(ast.body.name).toBe('foo');
    });

    it('should parse deferred expression', () => {
      const ast = parser.parse('#{foo}');
      expect(ast.type).toBe('DeferredExpression');
      expect(ast.body.name).toBe('foo');
    });

    it('should parse dot access', () => {
      const ast = parser.parse('${foo.bar}');
      expect(ast.body.type).toBe('MemberExpression');
      expect(ast.body.computed).toBe(false);
      expect(ast.body.object.name).toBe('foo');
      expect(ast.body.property.name).toBe('bar');
    });

    it('should parse bracket access', () => {
      const ast = parser.parse("${foo['bar']}");
      expect(ast.body.type).toBe('MemberExpression');
      expect(ast.body.computed).toBe(true);
      expect(ast.body.object.name).toBe('foo');
      expect(ast.body.property.value).toBe('bar');
    });

    it('should parse method call without args', () => {
      const ast = parser.parse('${foo.bar()}');
      expect(ast.body.type).toBe('CallExpression');
      expect(ast.body.callee.type).toBe('MemberExpression');
      expect(ast.body.arguments).toHaveLength(0);
    });

    it('should parse method call with args', () => {
      const ast = parser.parse("${foo.bar(1, 'a')}");
      expect(ast.body.type).toBe('CallExpression');
      expect(ast.body.arguments).toHaveLength(2);
      expect(ast.body.arguments[0].value).toBe(1);
      expect(ast.body.arguments[1].value).toBe('a');
    });

    it('should parse chained member access', () => {
      const ast = parser.parse('${foo.bar().baz}');
      expect(ast.body.type).toBe('MemberExpression');
      expect(ast.body.property.name).toBe('baz');
      expect(ast.body.object.type).toBe('CallExpression');
    });

    it('should parse addition', () => {
      const ast = parser.parse('${a + b}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('+');
    });

    it('should parse arithmetic with precedence', () => {
      const ast = parser.parse('${a + b * c}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('+');
      expect(ast.body.right.type).toBe('BinaryExpression');
      expect(ast.body.right.operator).toBe('*');
    });

    it('should parse comparison operators', () => {
      for (const op of ['>', '<', '>=', '<=', '==', '!=']) {
        const ast = parser.parse(`\${a ${op} b}`);
        expect(ast.body.type).toBe('BinaryExpression');
      }
    });

    it('should parse word operators', () => {
      const cases = [
        ['gt', '>'], ['lt', '<'], ['ge', '>='], ['le', '<='],
        ['eq', '=='], ['ne', '!='], ['div', 'div'], ['mod', 'mod']
      ];
      for (const [word] of cases) {
        const ast = parser.parse(`\${a ${word} b}`);
        expect(ast.body.type).toBe('BinaryExpression');
      }
    });

    it('should parse logical AND', () => {
      const ast = parser.parse('${a && b}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('&&');
    });

    it('should parse logical OR', () => {
      const ast = parser.parse('${a || b}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('||');
    });

    it('should parse word logical operators', () => {
      const ast = parser.parse('${a and b or c}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('||');
    });

    it('should parse unary not', () => {
      const ast = parser.parse('${!a}');
      expect(ast.body.type).toBe('UnaryExpression');
      expect(ast.body.operator).toBe('!');
    });

    it('should parse unary not (word)', () => {
      const ast = parser.parse('${not a}');
      expect(ast.body.type).toBe('UnaryExpression');
      expect(ast.body.operator).toBe('!');
    });

    it('should parse unary minus', () => {
      const ast = parser.parse('${-a}');
      expect(ast.body.type).toBe('UnaryExpression');
      expect(ast.body.operator).toBe('-');
    });

    it('should parse empty operator', () => {
      const ast = parser.parse('${empty foo}');
      expect(ast.body.type).toBe('UnaryExpression');
      expect(ast.body.operator).toBe('empty');
    });

    it('should parse ternary', () => {
      const ast = parser.parse('${a ? b : c}');
      expect(ast.body.type).toBe('Ternary');
      expect(ast.body.condition.name).toBe('a');
      expect(ast.body.consequent.name).toBe('b');
      expect(ast.body.alternate.name).toBe('c');
    });

    it('should parse nested parens', () => {
      const ast = parser.parse('${(a + b) * c}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('*');
      expect(ast.body.left.type).toBe('BinaryExpression');
      expect(ast.body.left.operator).toBe('+');
    });

    it('should parse string literals (single quotes)', () => {
      const ast = parser.parse("${'hello'}");
      expect(ast.body.type).toBe('Literal');
      expect(ast.body.value).toBe('hello');
    });

    it('should parse string literals (double quotes)', () => {
      const ast = parser.parse('${"hello"}');
      expect(ast.body.type).toBe('Literal');
      expect(ast.body.value).toBe('hello');
    });

    it('should parse integer literal', () => {
      const ast = parser.parse('${42}');
      expect(ast.body.type).toBe('Literal');
      expect(ast.body.value).toBe(42);
    });

    it('should parse float literal', () => {
      const ast = parser.parse('${3.14}');
      expect(ast.body.type).toBe('Literal');
      expect(ast.body.value).toBeCloseTo(3.14);
    });

    it('should parse leading-dot float', () => {
      const ast = parser.parse('${.5}');
      expect(ast.body.type).toBe('Literal');
      expect(ast.body.value).toBeCloseTo(0.5);
    });

    it('should parse scientific notation', () => {
      const ast = parser.parse('${1.5e10}');
      expect(ast.body.type).toBe('Literal');
      expect(ast.body.value).toBe(1.5e10);
    });

    it('should parse scientific notation with uppercase E', () => {
      const ast = parser.parse('${3E5}');
      expect(ast.body.value).toBe(3e5);
    });

    it('should parse scientific notation with negative exponent', () => {
      const ast = parser.parse('${3E-5}');
      expect(ast.body.value).toBeCloseTo(3e-5);
    });

    it('should parse scientific notation with positive sign', () => {
      const ast = parser.parse('${2.1E+3}');
      expect(ast.body.value).toBe(2.1e3);
    });

    it('should parse leading-dot with exponent', () => {
      const ast = parser.parse('${.5E+3}');
      expect(ast.body.value).toBe(0.5e3);
    });

    it('should parse boolean true', () => {
      const ast = parser.parse('${true}');
      expect(ast.body.value).toBe(true);
    });

    it('should parse boolean false', () => {
      const ast = parser.parse('${false}');
      expect(ast.body.value).toBe(false);
    });

    it('should parse null', () => {
      const ast = parser.parse('${null}');
      expect(ast.body.value).toBe(null);
    });

    it('should parse function call (S)', () => {
      const ast = parser.parse('${S(json)}');
      expect(ast.body.type).toBe('CallExpression');
      expect(ast.body.callee.name).toBe('S');
      expect(ast.body.arguments[0].name).toBe('json');
    });

    it('should parse SPIN chain', () => {
      const ast = parser.parse("${S(json).prop('key').stringValue()}");
      expect(ast.body.type).toBe('CallExpression');
      // stringValue()
      expect(ast.body.callee.property.name).toBe('stringValue');
    });

    it('should parse complex ternary', () => {
      const ast = parser.parse('${a > 0 ? a : -a}');
      expect(ast.body.type).toBe('Ternary');
      expect(ast.body.condition.type).toBe('BinaryExpression');
      expect(ast.body.alternate.type).toBe('UnaryExpression');
    });

    it('should parse whitespace-heavy expression', () => {
      const ast = parser.parse('${  a   +   b  }');
      expect(ast.body.type).toBe('BinaryExpression');
    });

    it('should parse case-insensitive keywords', () => {
      expect(parser.parse('${TRUE}').body.value).toBe(true);
      expect(parser.parse('${False}').body.value).toBe(false);
      expect(parser.parse('${NULL}').body.value).toBe(null);
      expect(parser.parse('${EMPTY foo}').body.operator).toBe('empty');
    });

    it('should parse instanceof', () => {
      const ast = parser.parse('${a instanceof b}');
      expect(ast.body.type).toBe('BinaryExpression');
      expect(ast.body.operator).toBe('instanceof');
    });

    it('should parse escaped strings', () => {
      const ast = parser.parse("${'it\\'s'}");
      expect(ast.body.value).toBe("it's");
    });

    it('should parse literal text (no expression)', () => {
      const ast = parser.parse('hello world');
      expect(ast.type).toBe('LiteralExpression');
      expect(ast.value).toBe('hello world');
    });
  });

  // --- Invalid expressions ---

  describe('invalid expressions', () => {

    it('should reject missing closing brace', () => {
      expect(() => parser.parse('${foo')).toThrow();
    });

    it('should reject missing operand', () => {
      expect(() => parser.parse('${foo +}')).toThrow();
    });

    it('should reject unclosed string', () => {
      expect(() => parser.parse("${'hello}")).toThrow();
    });

    it('should reject unclosed paren', () => {
      expect(() => parser.parse('${foo.bar(}')).toThrow();
    });

    it('should reject empty expression', () => {
      expect(() => parser.parse('${}')).toThrow();
    });

    it('should reject double operator', () => {
      expect(() => parser.parse('${a ++ b}')).toThrow();
    });
  });

  // --- Mixed text + expressions ---

  describe('mixed text and expressions', () => {

    it('should parse text followed by expression', () => {
      const ast = parser.parse('Hello ${name}');
      expect(ast.type).toBe('CompositeExpression');
      expect(ast.parts).toHaveLength(2);
      expect(ast.parts[0].type).toBe('LiteralExpression');
      expect(ast.parts[0].value).toBe('Hello ');
      expect(ast.parts[1].type).toBe('DynamicExpression');
      expect(ast.parts[1].body.name).toBe('name');
    });

    it('should parse expression followed by text', () => {
      const ast = parser.parse('${name} is here');
      expect(ast.type).toBe('CompositeExpression');
      expect(ast.parts).toHaveLength(2);
      expect(ast.parts[0].type).toBe('DynamicExpression');
      expect(ast.parts[1].type).toBe('LiteralExpression');
    });

    it('should parse multiple expressions with text between', () => {
      const ast = parser.parse('Hello ${first}, your order #${orderId} is ready');
      expect(ast.type).toBe('CompositeExpression');
      // 'Hello ' + ${first} + ', your order #' + ${orderId} + ' is ready'
      expect(ast.parts).toHaveLength(5);
      expect(ast.parts[0].type).toBe('LiteralExpression');
      expect(ast.parts[1].type).toBe('DynamicExpression');
      expect(ast.parts[2].type).toBe('LiteralExpression');
      expect(ast.parts[3].type).toBe('DynamicExpression');
      expect(ast.parts[4].type).toBe('LiteralExpression');
    });

    it('should parse adjacent expressions without text between', () => {
      const ast = parser.parse('${a}${b}');
      expect(ast.type).toBe('CompositeExpression');
      expect(ast.parts).toHaveLength(2);
    });

    it('should unwrap single expression (no CompositeExpression wrapper)', () => {
      const ast = parser.parse('${foo}');
      expect(ast.type).toBe('DynamicExpression');
    });

    it('should unwrap single literal (no CompositeExpression wrapper)', () => {
      const ast = parser.parse('hello');
      expect(ast.type).toBe('LiteralExpression');
    });
  });

  // --- Location tracking ---

  describe('location tracking', () => {

    it('should include location on identifiers', () => {
      const ast = parser.parse('${foo}');
      expect(ast.body.location).toBeDefined();
      expect(ast.body.location.start).toBeDefined();
      expect(ast.body.location.end).toBeDefined();
    });

    it('should include location on binary expressions', () => {
      const ast = parser.parse('${a + b}');
      expect(ast.body.location).toBeDefined();
    });
  });
});
