// JUEL Expression Grammar for Camunda 7
// Parses ${...} and #{...} expressions, producing an AST.

{
  function loc() {
    return location();
  }
}

Start
  = parts:Part+ {
      return parts.length === 1 ? parts[0] : { type: 'CompositeExpression', parts, location: loc() };
    }

Part
  = DeferredExpression
  / DynamicExpression
  / LiteralExpression

DeferredExpression
  = "#{" _ expr:Expression _ "}" {
      return { type: 'DeferredExpression', body: expr, location: loc() };
    }

DynamicExpression
  = "${" _ expr:Expression _ "}" {
      return { type: 'DynamicExpression', body: expr, location: loc() };
    }

LiteralExpression
  = chars:LiteralChar+ {
      return { type: 'LiteralExpression', value: chars.join(''), location: loc() };
    }

LiteralChar
  = "\\$" { return '$'; }
  / "\\#" { return '#'; }
  / "\\\\" { return '\\'; }
  / !("${" / "#{") c:. { return c; }

// --- Expressions (precedence climbing) ---

Expression
  = Ternary

Ternary
  = condition:Or _ "?" _ consequent:Expression _ ":" _ alternate:Expression {
      return { type: 'Ternary', condition, consequent, alternate, location: loc() };
    }
  / Or

Or
  = head:And tail:(_ ("||" / "or"i) _ And)* {
      return tail.reduce((left, [, op, , right]) => ({
        type: 'BinaryExpression', operator: '||', left, right, location: loc()
      }), head);
    }

And
  = head:Equality tail:(_ ("&&" / "and"i) _ Equality)* {
      return tail.reduce((left, [, op, , right]) => ({
        type: 'BinaryExpression', operator: '&&', left, right, location: loc()
      }), head);
    }

Equality
  = head:Comparison tail:(_ ("==" / "!=" / "eq"i / "ne"i) _ Comparison)* {
      return tail.reduce((left, [, op, , right]) => ({
        type: 'BinaryExpression',
        operator: (op === 'eq' || op === 'EQ' || op === 'Eq') ? '==' : (op === 'ne' || op === 'NE' || op === 'Ne') ? '!=' : op,
        left, right, location: loc()
      }), head);
    }

Comparison
  = head:Addition tail:(_ ("<=" / ">=" / "<" / ">" / "lt"i / "gt"i / "le"i / "ge"i / "instanceof"i) _ Addition)* {
      return tail.reduce((left, [, op, , right]) => ({
        type: 'BinaryExpression', operator: op.toLowerCase(), left, right, location: loc()
      }), head);
    }

Addition
  = head:Multiplication tail:(_ ("+" / "-") _ Multiplication)* {
      return tail.reduce((left, [, op, , right]) => ({
        type: 'BinaryExpression', operator: op, left, right, location: loc()
      }), head);
    }

Multiplication
  = head:Unary tail:(_ ("*" / "/" / "%" / "div"i / "mod"i) _ Unary)* {
      return tail.reduce((left, [, op, , right]) => ({
        type: 'BinaryExpression', operator: op.toLowerCase(), left, right, location: loc()
      }), head);
    }

Unary
  = "-" _ expr:Unary {
      return { type: 'UnaryExpression', operator: '-', argument: expr, location: loc() };
    }
  / ("!" / "not"i) _ expr:Unary {
      return { type: 'UnaryExpression', operator: '!', argument: expr, location: loc() };
    }
  / "empty"i _ expr:Unary {
      return { type: 'UnaryExpression', operator: 'empty', argument: expr, location: loc() };
    }
  / MemberExpression

// --- Member access, method calls, function calls ---

MemberExpression
  = head:Primary tail:(
      _ "." _ id:Identifier { return { type: 'dot', property: id }; }
    / _ "[" _ expr:Expression _ "]" { return { type: 'bracket', property: expr }; }
    / _ "(" _ args:ArgumentList _ ")" { return { type: 'call', arguments: args }; }
  )* {
      return tail.reduce((object, access) => {
        if (access.type === 'dot') {
          return { type: 'MemberExpression', object, property: access.property, computed: false, location: loc() };
        } else if (access.type === 'bracket') {
          return { type: 'MemberExpression', object, property: access.property, computed: true, location: loc() };
        } else {
          return { type: 'CallExpression', callee: object, arguments: access.arguments, location: loc() };
        }
      }, head);
    }

ArgumentList
  = head:Expression tail:(_ "," _ Expression)* {
      return [head, ...tail.map(t => t[3])];
    }
  / "" { return []; }

// --- Primary expressions ---

Primary
  = NullLiteral
  / BooleanLiteral
  / NumberLiteral
  / StringLiteral
  / "(" _ expr:Expression _ ")" { return expr; }
  / Identifier

NullLiteral
  = "null"i !IdentifierPart {
      return { type: 'Literal', value: null, location: loc() };
    }

BooleanLiteral
  = "true"i !IdentifierPart {
      return { type: 'Literal', value: true, location: loc() };
    }
  / "false"i !IdentifierPart {
      return { type: 'Literal', value: false, location: loc() };
    }

NumberLiteral
  = text:NumberText {
      return { type: 'Literal', value: parseFloat(text), location: loc() };
    }

// Integer: 42
// Float: 3.14, .5, 42.
// Scientific: 1.5e10, 3E-5, .5E+3, 42e2
NumberText "number"
  = whole:[0-9]+ frac:("." [0-9]*)? exp:Exponent? {
      let s = whole.join('');
      if (frac) s += '.' + (frac[1] ? frac[1].join('') : '');
      if (exp) s += exp;
      return s;
    }
  / "." digits:[0-9]+ exp:Exponent? {
      let s = '.' + digits.join('');
      if (exp) s += exp;
      return s;
    }

Exponent
  = [eE] sign:[+\-]? digits:[0-9]+ {
      return 'e' + (sign || '') + digits.join('');
    }

StringLiteral
  = "'" chars:SingleStringChar* "'" {
      return { type: 'Literal', value: chars.join(''), location: loc() };
    }
  / '"' chars:DoubleStringChar* '"' {
      return { type: 'Literal', value: chars.join(''), location: loc() };
    }

SingleStringChar
  = "\\'" { return "'"; }
  / "\\\\" { return "\\"; }
  / [^'\\]

DoubleStringChar
  = '\\"' { return '"'; }
  / "\\\\" { return "\\"; }
  / [^"\\]

Identifier
  = !ReservedWord head:IdentifierStart tail:IdentifierPart* {
      return { type: 'Identifier', name: head + tail.join(''), location: loc() };
    }

IdentifierStart
  = [a-zA-Z_$]

IdentifierPart
  = [a-zA-Z0-9_$]

ReservedWord
  = ("true"i / "false"i / "null"i / "empty"i / "not"i / "and"i / "or"i
    / "eq"i / "ne"i / "lt"i / "gt"i / "le"i / "ge"i / "div"i / "mod"i
    / "instanceof"i) !IdentifierPart

// --- Whitespace ---

_ "whitespace"
  = [ \t\n\r]*
