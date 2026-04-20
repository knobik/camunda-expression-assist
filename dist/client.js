/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/ExpressionAssistPlugin.js"
/*!***************************************!*\
  !*** ./src/ExpressionAssistPlugin.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ExpressionAssistPlugin)
/* harmony export */ });
/* harmony import */ var _FieldInterceptor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FieldInterceptor */ "./src/FieldInterceptor.js");

class ExpressionAssistPlugin {
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._variables = [];
    this._fieldInterceptor = null;
    this._containerObserver = null;
    eventBus.on('variableScanner.variablesChanged', e => {
      this._variables = e.variables || [];
    });
    eventBus.on('canvas.init', () => {
      this._watchForPropertiesContainer();
    });
    eventBus.on('diagram.destroy', () => {
      this._destroy();
    });
  }

  // Container gets destroyed and recreated on XML<->modeler toggle
  _watchForPropertiesContainer() {
    if (this._containerObserver) {
      this._containerObserver.disconnect();
    }
    const tryAttach = () => {
      const container = document.querySelector('.properties-container');
      if (container && container !== this._currentContainer) {
        this._currentContainer = container;
        this._attachInterceptor(container);
      }
    };

    // Observe body for container changes
    this._containerObserver = new MutationObserver(() => {
      tryAttach();
    });
    this._containerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Try immediately
    tryAttach();
  }
  _attachInterceptor(container) {
    if (this._fieldInterceptor) {
      this._fieldInterceptor.destroy();
    }
    this._fieldInterceptor = new _FieldInterceptor__WEBPACK_IMPORTED_MODULE_0__["default"](() => this._variables);
    this._fieldInterceptor.attach(container);
  }
  _destroy() {
    if (this._fieldInterceptor) {
      this._fieldInterceptor.destroy();
      this._fieldInterceptor = null;
    }
    if (this._containerObserver) {
      this._containerObserver.disconnect();
      this._containerObserver = null;
    }
    this._currentContainer = null;
    this._variables = [];
  }
}
ExpressionAssistPlugin.$inject = ['eventBus'];

/***/ },

/***/ "./src/FieldInterceptor.js"
/*!*********************************!*\
  !*** ./src/FieldInterceptor.js ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ FieldInterceptor)
/* harmony export */ });
/* harmony import */ var _JuelValidator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./JuelValidator */ "./src/JuelValidator.js");

const INPUT_SELECTOR = ['input.bio-properties-panel-input[type="text"]', 'textarea.bio-properties-panel-input', '[contenteditable].bio-properties-panel-input'].join(', ');
class FieldInterceptor {
  constructor(getVariables) {
    this._getVariables = getVariables;
    this._validationMarkers = new Map();
    this._tooltipEl = null;
    this._tooltipInput = null;
    this._focusoutTimer = null;
    this._handlers = {
      focusin: e => this._onFocusIn(e),
      focusout: e => this._onFocusOut(e),
      mouseover: e => this._onMouseOver(e),
      mouseout: e => this._onMouseOut(e)
    };
  }
  attach(container) {
    this.detach();
    this._container = container;
    for (const [event, handler] of Object.entries(this._handlers)) {
      container.addEventListener(event, handler, true);
    }
    this._observer = new MutationObserver(() => {
      clearTimeout(this._scanDebounce);
      this._scanDebounce = setTimeout(() => this._validateAllFields(), 150);
    });
    this._observer.observe(container, {
      childList: true,
      subtree: true
    });
    this._validateAllFields();
  }
  detach() {
    if (this._container) {
      for (const [event, handler] of Object.entries(this._handlers)) {
        this._container.removeEventListener(event, handler, true);
      }
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    clearTimeout(this._scanDebounce);
    clearTimeout(this._focusoutTimer);
    this._clearAllValidation();
    this._container = null;
  }
  destroy() {
    this.detach();
    this._removeTooltip();
  }
  _onFocusIn(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;
    clearTimeout(this._focusoutTimer);
    this._clearValidation(input);
  }
  _onFocusOut(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;
    this._removeTooltip();
    clearTimeout(this._focusoutTimer);
    this._focusoutTimer = setTimeout(() => {
      this._validateField(input);
    }, 100);
  }
  _onMouseOver(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;
    const marker = this._validationMarkers.get(input);
    if (marker) {
      this._showTooltip(input, marker.messages);
    }
  }
  _onMouseOut(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;
    if (this._tooltipInput === input) {
      this._removeTooltip();
    }
  }
  _validateAllFields() {
    if (!this._container) return;
    for (const [input] of this._validationMarkers) {
      if (!this._container.contains(input)) {
        this._validationMarkers.delete(input);
        if (this._tooltipInput === input) {
          this._removeTooltip();
        }
      }
    }
    const inputs = this._container.querySelectorAll(INPUT_SELECTOR);
    for (const input of inputs) {
      if (document.activeElement === input) continue;
      this._validateField(input);
    }
  }
  _validateField(input) {
    const value = input.value || input.textContent || '';

    // Skip re-validation if value hasn't changed
    const marker = this._validationMarkers.get(input);
    if (marker && marker.lastValue === value) return;
    if (!value.includes('${') && !value.includes('#{')) {
      this._clearValidation(input);
      return;
    }
    const variables = this._getVariables();
    const diagnostics = (0,_JuelValidator__WEBPACK_IMPORTED_MODULE_0__.validate)(value, variables);
    if (diagnostics.length === 0) {
      this._clearValidation(input);
      return;
    }
    const hasError = diagnostics.some(d => d.type === 'error');
    const cls = hasError ? 'ea-validation-error' : 'ea-validation-warning';
    input.classList.remove('ea-validation-error', 'ea-validation-warning');
    input.classList.add(cls);
    const messages = diagnostics.map(d => {
      let msg = d.message;
      if (d.type === 'warning' && d.variableName) {
        const suggestion = (0,_JuelValidator__WEBPACK_IMPORTED_MODULE_0__.findSimilar)(d.variableName, variables);
        if (suggestion) msg += ` — did you mean '${suggestion}'?`;
      }
      return msg;
    });
    this._validationMarkers.set(input, {
      cls,
      messages,
      lastValue: value
    });
  }
  _clearValidation(input) {
    input.classList.remove('ea-validation-error', 'ea-validation-warning');
    this._validationMarkers.delete(input);
    if (this._tooltipInput === input) {
      this._removeTooltip();
    }
  }
  _clearAllValidation() {
    for (const [input] of this._validationMarkers) {
      input.classList.remove('ea-validation-error', 'ea-validation-warning');
    }
    this._validationMarkers.clear();
    this._removeTooltip();
  }
  _showTooltip(input, messages) {
    this._removeTooltip();
    const el = document.createElement('div');
    el.className = 'ea-tooltip';
    for (const msg of messages) {
      const line = document.createElement('div');
      line.className = 'ea-tooltip-line';
      line.textContent = msg;
      el.appendChild(line);
    }
    const rect = input.getBoundingClientRect();
    el.style.left = rect.left + 'px';
    el.style.top = rect.bottom + 4 + 'px';
    document.body.appendChild(el);
    this._tooltipEl = el;
    this._tooltipInput = input;
  }
  _removeTooltip() {
    if (this._tooltipEl && this._tooltipEl.parentNode) {
      this._tooltipEl.parentNode.removeChild(this._tooltipEl);
    }
    this._tooltipEl = null;
    this._tooltipInput = null;
  }
}

/***/ },

/***/ "./src/JuelValidator.js"
/*!******************************!*\
  !*** ./src/JuelValidator.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   findSimilar: () => (/* binding */ findSimilar),
/* harmony export */   validate: () => (/* binding */ validate)
/* harmony export */ });
/* harmony import */ var _juelParser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./juelParser */ "./src/juelParser.js");

function collectVariableRefs(node, refs = []) {
  if (!node || typeof node !== 'object') return refs;
  if (node.type === 'Identifier') {
    refs.push({
      name: node.name,
      location: node.location
    });
  }
  if (node.type === 'MemberExpression' && !node.computed) {
    collectVariableRefs(node.object, refs);
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
  for (const key of ['body', 'condition', 'consequent', 'alternate', 'left', 'right', 'argument']) {
    if (node[key]) collectVariableRefs(node[key], refs);
  }
  return refs;
}
const BUILTINS = new Set(['pageContext', 'pageScope', 'requestScope', 'sessionScope', 'applicationScope', 'param', 'paramValues', 'header', 'headerValues', 'initParam', 'cookie', 'execution', 'task', 'authenticatedUserId', 'currentUser', 'now', 'dateTime', 'connector', 'S', 'XML', 'JSON', 'Math', 'Integer', 'Long', 'Double', 'String', 'Boolean', 'SPIN']);
function validate(value, knownVariables = []) {
  const diagnostics = [];
  const knownNames = new Set(knownVariables.map(v => v.name));
  const exprPattern = /(\$\{|\#\{)/g;
  let match;
  while ((match = exprPattern.exec(value)) !== null) {
    const start = match.index;
    let depth = 1;
    let pos = start + 2;
    let inStr = false;
    let strChar = null;
    while (pos < value.length && depth > 0) {
      const ch = value[pos];
      if (inStr) {
        if (ch === '\\') {
          pos++;
        } else if (ch === strChar) {
          inStr = false;
        }
      } else {
        if (ch === "'" || ch === '"') {
          inStr = true;
          strChar = ch;
        } else if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
        }
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
    const exprText = value.substring(start, pos);
    let ast;
    try {
      ast = _juelParser__WEBPACK_IMPORTED_MODULE_0__.parse(exprText);
    } catch (e) {
      const msg = e.message || 'Syntax error';
      const cleanMsg = msg.includes('Expected') ? msg.substring(0, msg.indexOf('.') + 1) || msg : msg;
      diagnostics.push({
        type: 'error',
        message: cleanMsg,
        offset: start + (e.location ? e.location.start.offset : 2)
      });
      continue;
    }
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
function findSimilar(name, knownVariables) {
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
  const m = a.length,
    n = b.length;
  const dp = Array.from({
    length: m + 1
  }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/***/ },

/***/ "./src/juelParser.js"
/*!***************************!*\
  !*** ./src/juelParser.js ***!
  \***************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StartRules: () => (/* binding */ peg$allowedStartRules),
/* harmony export */   SyntaxError: () => (/* binding */ peg$SyntaxError),
/* harmony export */   parse: () => (/* binding */ peg$parse)
/* harmony export */ });
// @generated by Peggy 4.2.0.
//
// https://peggyjs.org/

function peg$subclass(child, parent) {
  function C() {
    this.constructor = child;
  }
  C.prototype = parent.prototype;
  child.prototype = new C();
}
function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}
peg$subclass(peg$SyntaxError, Error);
function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) {
    return str;
  }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}
peg$SyntaxError.prototype.format = function (sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = last - s.column || 1;
      str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, ' ') + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};
peg$SyntaxError.buildMessage = function (expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function (expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },
    class: function (expectation) {
      var escapedParts = expectation.parts.map(function (part) {
        return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
      });
      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },
    any: function () {
      return "any character";
    },
    end: function () {
      return "end of input";
    },
    other: function (expectation) {
      return expectation.description;
    }
  };
  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }
  function literalEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function (ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) {
      return "\\x" + hex(ch);
    });
  }
  function classEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function (ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) {
      return "\\x" + hex(ch);
    });
  }
  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }
  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;
    descriptions.sort();
    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }
    switch (descriptions.length) {
      case 1:
        return descriptions[0];
      case 2:
        return descriptions[0] + " or " + descriptions[1];
      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }
  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }
  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};
function peg$parse(input, options) {
  options = options !== undefined ? options : {};
  var peg$FAILED = {};
  var peg$source = options.grammarSource;
  var peg$startRuleFunctions = {
    Start: peg$parseStart
  };
  var peg$startRuleFunction = peg$parseStart;
  var peg$c0 = "#{";
  var peg$c1 = "}";
  var peg$c2 = "${";
  var peg$c3 = "\\$";
  var peg$c4 = "\\#";
  var peg$c5 = "\\\\";
  var peg$c6 = "?";
  var peg$c7 = ":";
  var peg$c8 = "||";
  var peg$c9 = "or";
  var peg$c10 = "&&";
  var peg$c11 = "and";
  var peg$c12 = "==";
  var peg$c13 = "!=";
  var peg$c14 = "eq";
  var peg$c15 = "ne";
  var peg$c16 = "<=";
  var peg$c17 = ">=";
  var peg$c18 = "lt";
  var peg$c19 = "gt";
  var peg$c20 = "le";
  var peg$c21 = "ge";
  var peg$c22 = "instanceof";
  var peg$c23 = "div";
  var peg$c24 = "mod";
  var peg$c25 = "-";
  var peg$c26 = "!";
  var peg$c27 = "not";
  var peg$c28 = "empty";
  var peg$c29 = ".";
  var peg$c30 = "[";
  var peg$c31 = "]";
  var peg$c32 = "(";
  var peg$c33 = ")";
  var peg$c34 = ",";
  var peg$c35 = "null";
  var peg$c36 = "true";
  var peg$c37 = "false";
  var peg$c38 = "'";
  var peg$c39 = "\"";
  var peg$c40 = "\\'";
  var peg$c41 = "\\\"";
  var peg$r0 = /^[<>]/;
  var peg$r1 = /^[+\-]/;
  var peg$r2 = /^[%*\/]/;
  var peg$r3 = /^[0-9]/;
  var peg$r4 = /^[eE]/;
  var peg$r5 = /^[^'\\]/;
  var peg$r6 = /^[^"\\]/;
  var peg$r7 = /^[a-zA-Z_$]/;
  var peg$r8 = /^[a-zA-Z0-9_$]/;
  var peg$r9 = /^[ \t\n\r]/;
  var peg$e0 = peg$literalExpectation("#{", false);
  var peg$e1 = peg$literalExpectation("}", false);
  var peg$e2 = peg$literalExpectation("${", false);
  var peg$e3 = peg$literalExpectation("\\$", false);
  var peg$e4 = peg$literalExpectation("\\#", false);
  var peg$e5 = peg$literalExpectation("\\\\", false);
  var peg$e6 = peg$anyExpectation();
  var peg$e7 = peg$literalExpectation("?", false);
  var peg$e8 = peg$literalExpectation(":", false);
  var peg$e9 = peg$literalExpectation("||", false);
  var peg$e10 = peg$literalExpectation("or", true);
  var peg$e11 = peg$literalExpectation("&&", false);
  var peg$e12 = peg$literalExpectation("and", true);
  var peg$e13 = peg$literalExpectation("==", false);
  var peg$e14 = peg$literalExpectation("!=", false);
  var peg$e15 = peg$literalExpectation("eq", true);
  var peg$e16 = peg$literalExpectation("ne", true);
  var peg$e17 = peg$literalExpectation("<=", false);
  var peg$e18 = peg$literalExpectation(">=", false);
  var peg$e19 = peg$classExpectation(["<", ">"], false, false);
  var peg$e20 = peg$literalExpectation("lt", true);
  var peg$e21 = peg$literalExpectation("gt", true);
  var peg$e22 = peg$literalExpectation("le", true);
  var peg$e23 = peg$literalExpectation("ge", true);
  var peg$e24 = peg$literalExpectation("instanceof", true);
  var peg$e25 = peg$classExpectation(["+", "-"], false, false);
  var peg$e26 = peg$classExpectation(["%", "*", "/"], false, false);
  var peg$e27 = peg$literalExpectation("div", true);
  var peg$e28 = peg$literalExpectation("mod", true);
  var peg$e29 = peg$literalExpectation("-", false);
  var peg$e30 = peg$literalExpectation("!", false);
  var peg$e31 = peg$literalExpectation("not", true);
  var peg$e32 = peg$literalExpectation("empty", true);
  var peg$e33 = peg$literalExpectation(".", false);
  var peg$e34 = peg$literalExpectation("[", false);
  var peg$e35 = peg$literalExpectation("]", false);
  var peg$e36 = peg$literalExpectation("(", false);
  var peg$e37 = peg$literalExpectation(")", false);
  var peg$e38 = peg$literalExpectation(",", false);
  var peg$e39 = peg$literalExpectation("null", true);
  var peg$e40 = peg$literalExpectation("true", true);
  var peg$e41 = peg$literalExpectation("false", true);
  var peg$e42 = peg$otherExpectation("number");
  var peg$e43 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e44 = peg$classExpectation(["e", "E"], false, false);
  var peg$e45 = peg$literalExpectation("'", false);
  var peg$e46 = peg$literalExpectation("\"", false);
  var peg$e47 = peg$literalExpectation("\\'", false);
  var peg$e48 = peg$classExpectation(["'", "\\"], true, false);
  var peg$e49 = peg$literalExpectation("\\\"", false);
  var peg$e50 = peg$classExpectation(["\"", "\\"], true, false);
  var peg$e51 = peg$classExpectation([["a", "z"], ["A", "Z"], "_", "$"], false, false);
  var peg$e52 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_", "$"], false, false);
  var peg$e53 = peg$otherExpectation("whitespace");
  var peg$e54 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false);
  var peg$f0 = function (parts) {
    return parts.length === 1 ? parts[0] : {
      type: 'CompositeExpression',
      parts,
      location: loc()
    };
  };
  var peg$f1 = function (expr) {
    return {
      type: 'DeferredExpression',
      body: expr,
      location: loc()
    };
  };
  var peg$f2 = function (expr) {
    return {
      type: 'DynamicExpression',
      body: expr,
      location: loc()
    };
  };
  var peg$f3 = function (chars) {
    return {
      type: 'LiteralExpression',
      value: chars.join(''),
      location: loc()
    };
  };
  var peg$f4 = function () {
    return '$';
  };
  var peg$f5 = function () {
    return '#';
  };
  var peg$f6 = function () {
    return '\\';
  };
  var peg$f7 = function (c) {
    return c;
  };
  var peg$f8 = function (condition, consequent, alternate) {
    return {
      type: 'Ternary',
      condition,
      consequent,
      alternate,
      location: loc()
    };
  };
  var peg$f9 = function (head, tail) {
    return tail.reduce((left, [, op,, right]) => ({
      type: 'BinaryExpression',
      operator: '||',
      left,
      right,
      location: loc()
    }), head);
  };
  var peg$f10 = function (head, tail) {
    return tail.reduce((left, [, op,, right]) => ({
      type: 'BinaryExpression',
      operator: '&&',
      left,
      right,
      location: loc()
    }), head);
  };
  var peg$f11 = function (head, tail) {
    return tail.reduce((left, [, op,, right]) => ({
      type: 'BinaryExpression',
      operator: op === 'eq' || op === 'EQ' || op === 'Eq' ? '==' : op === 'ne' || op === 'NE' || op === 'Ne' ? '!=' : op,
      left,
      right,
      location: loc()
    }), head);
  };
  var peg$f12 = function (head, tail) {
    return tail.reduce((left, [, op,, right]) => ({
      type: 'BinaryExpression',
      operator: op.toLowerCase(),
      left,
      right,
      location: loc()
    }), head);
  };
  var peg$f13 = function (head, tail) {
    return tail.reduce((left, [, op,, right]) => ({
      type: 'BinaryExpression',
      operator: op,
      left,
      right,
      location: loc()
    }), head);
  };
  var peg$f14 = function (head, tail) {
    return tail.reduce((left, [, op,, right]) => ({
      type: 'BinaryExpression',
      operator: op.toLowerCase(),
      left,
      right,
      location: loc()
    }), head);
  };
  var peg$f15 = function (expr) {
    return {
      type: 'UnaryExpression',
      operator: '-',
      argument: expr,
      location: loc()
    };
  };
  var peg$f16 = function (expr) {
    return {
      type: 'UnaryExpression',
      operator: '!',
      argument: expr,
      location: loc()
    };
  };
  var peg$f17 = function (expr) {
    return {
      type: 'UnaryExpression',
      operator: 'empty',
      argument: expr,
      location: loc()
    };
  };
  var peg$f18 = function (head, id) {
    return {
      type: 'dot',
      property: id
    };
  };
  var peg$f19 = function (head, expr) {
    return {
      type: 'bracket',
      property: expr
    };
  };
  var peg$f20 = function (head, args) {
    return {
      type: 'call',
      arguments: args
    };
  };
  var peg$f21 = function (head, tail) {
    return tail.reduce((object, access) => {
      if (access.type === 'dot') {
        return {
          type: 'MemberExpression',
          object,
          property: access.property,
          computed: false,
          location: loc()
        };
      } else if (access.type === 'bracket') {
        return {
          type: 'MemberExpression',
          object,
          property: access.property,
          computed: true,
          location: loc()
        };
      } else {
        return {
          type: 'CallExpression',
          callee: object,
          arguments: access.arguments,
          location: loc()
        };
      }
    }, head);
  };
  var peg$f22 = function (head, tail) {
    return [head, ...tail.map(t => t[3])];
  };
  var peg$f23 = function () {
    return [];
  };
  var peg$f24 = function (expr) {
    return expr;
  };
  var peg$f25 = function () {
    return {
      type: 'Literal',
      value: null,
      location: loc()
    };
  };
  var peg$f26 = function () {
    return {
      type: 'Literal',
      value: true,
      location: loc()
    };
  };
  var peg$f27 = function () {
    return {
      type: 'Literal',
      value: false,
      location: loc()
    };
  };
  var peg$f28 = function (text) {
    return {
      type: 'Literal',
      value: parseFloat(text),
      location: loc()
    };
  };
  var peg$f29 = function (whole, frac, exp) {
    let s = whole.join('');
    if (frac) s += '.' + (frac[1] ? frac[1].join('') : '');
    if (exp) s += exp;
    return s;
  };
  var peg$f30 = function (digits, exp) {
    let s = '.' + digits.join('');
    if (exp) s += exp;
    return s;
  };
  var peg$f31 = function (sign, digits) {
    return 'e' + (sign || '') + digits.join('');
  };
  var peg$f32 = function (chars) {
    return {
      type: 'Literal',
      value: chars.join(''),
      location: loc()
    };
  };
  var peg$f33 = function (chars) {
    return {
      type: 'Literal',
      value: chars.join(''),
      location: loc()
    };
  };
  var peg$f34 = function () {
    return "'";
  };
  var peg$f35 = function () {
    return "\\";
  };
  var peg$f36 = function () {
    return '"';
  };
  var peg$f37 = function () {
    return "\\";
  };
  var peg$f38 = function (head, tail) {
    return {
      type: 'Identifier',
      name: head + tail.join(''),
      location: loc()
    };
  };
  var peg$currPos = options.peg$currPos | 0;
  var peg$savedPos = peg$currPos;
  var peg$posDetailsCache = [{
    line: 1,
    column: 1
  }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;
  var peg$result;
  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }
  function offset() {
    return peg$savedPos;
  }
  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }
  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }
  function expected(description, location) {
    location = location !== undefined ? location : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildStructuredError([peg$otherExpectation(description)], input.substring(peg$savedPos, peg$currPos), location);
  }
  function error(message, location) {
    location = location !== undefined ? location : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildSimpleError(message, location);
  }
  function peg$literalExpectation(text, ignoreCase) {
    return {
      type: "literal",
      text: text,
      ignoreCase: ignoreCase
    };
  }
  function peg$classExpectation(parts, inverted, ignoreCase) {
    return {
      type: "class",
      parts: parts,
      inverted: inverted,
      ignoreCase: ignoreCase
    };
  }
  function peg$anyExpectation() {
    return {
      type: "any"
    };
  }
  function peg$endExpectation() {
    return {
      type: "end"
    };
  }
  function peg$otherExpectation(description) {
    return {
      type: "other",
      description: description
    };
  }
  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;
    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {}
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);
    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset && peg$source && typeof peg$source.offset === "function") {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }
  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected);
  }
  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }
  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
  }
  function peg$parseStart() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsePart();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsePart();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f0(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parsePart() {
    var s0;
    s0 = peg$parseDeferredExpression();
    if (s0 === peg$FAILED) {
      s0 = peg$parseDynamicExpression();
      if (s0 === peg$FAILED) {
        s0 = peg$parseLiteralExpression();
      }
    }
    return s0;
  }
  function peg$parseDeferredExpression() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c0) {
      s1 = peg$c0;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      s3 = peg$parseTernary();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 125) {
          s5 = peg$c1;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f1(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseDynamicExpression() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c2) {
      s1 = peg$c2;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      s3 = peg$parseTernary();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 125) {
          s5 = peg$c1;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f2(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseLiteralExpression() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseLiteralChar();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseLiteralChar();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f3(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parseLiteralChar() {
    var s0, s1, s2;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c3) {
      s1 = peg$c3;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e3);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f4();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c4) {
        s1 = peg$c4;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f5();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c5) {
          s1 = peg$c5;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f6();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          peg$silentFails++;
          if (input.substr(peg$currPos, 2) === peg$c2) {
            s2 = peg$c2;
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c0) {
              s2 = peg$c0;
              peg$currPos += 2;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
          }
          peg$silentFails--;
          if (s2 === peg$FAILED) {
            s1 = undefined;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e6);
              }
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f7(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
      }
    }
    return s0;
  }
  function peg$parseTernary() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
    s0 = peg$currPos;
    s1 = peg$parseOr();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 63) {
        s3 = peg$c6;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        s5 = peg$parseTernary();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (input.charCodeAt(peg$currPos) === 58) {
            s7 = peg$c7;
            peg$currPos++;
          } else {
            s7 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e8);
            }
          }
          if (s7 !== peg$FAILED) {
            s8 = peg$parse_();
            s9 = peg$parseTernary();
            if (s9 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f8(s1, s5, s9);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseOr();
    }
    return s0;
  }
  function peg$parseOr() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseAnd();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.substr(peg$currPos, 2) === peg$c8) {
        s5 = peg$c8;
        peg$currPos += 2;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      if (s5 === peg$FAILED) {
        s5 = input.substr(peg$currPos, 2);
        if (s5.toLowerCase() === peg$c9) {
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseAnd();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.substr(peg$currPos, 2) === peg$c8) {
          s5 = peg$c8;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s5 === peg$FAILED) {
          s5 = input.substr(peg$currPos, 2);
          if (s5.toLowerCase() === peg$c9) {
            peg$currPos += 2;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e10);
            }
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseAnd();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f9(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseAnd() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseEquality();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.substr(peg$currPos, 2) === peg$c10) {
        s5 = peg$c10;
        peg$currPos += 2;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e11);
        }
      }
      if (s5 === peg$FAILED) {
        s5 = input.substr(peg$currPos, 3);
        if (s5.toLowerCase() === peg$c11) {
          peg$currPos += 3;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseEquality();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.substr(peg$currPos, 2) === peg$c10) {
          s5 = peg$c10;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        if (s5 === peg$FAILED) {
          s5 = input.substr(peg$currPos, 3);
          if (s5.toLowerCase() === peg$c11) {
            peg$currPos += 3;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e12);
            }
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseEquality();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f10(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseEquality() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseComparison();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.substr(peg$currPos, 2) === peg$c12) {
        s5 = peg$c12;
        peg$currPos += 2;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e13);
        }
      }
      if (s5 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c13) {
          s5 = peg$c13;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s5 === peg$FAILED) {
          s5 = input.substr(peg$currPos, 2);
          if (s5.toLowerCase() === peg$c14) {
            peg$currPos += 2;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e15);
            }
          }
          if (s5 === peg$FAILED) {
            s5 = input.substr(peg$currPos, 2);
            if (s5.toLowerCase() === peg$c15) {
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e16);
              }
            }
          }
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseComparison();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.substr(peg$currPos, 2) === peg$c12) {
          s5 = peg$c12;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e13);
          }
        }
        if (s5 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c13) {
            s5 = peg$c13;
            peg$currPos += 2;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e14);
            }
          }
          if (s5 === peg$FAILED) {
            s5 = input.substr(peg$currPos, 2);
            if (s5.toLowerCase() === peg$c14) {
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e15);
              }
            }
            if (s5 === peg$FAILED) {
              s5 = input.substr(peg$currPos, 2);
              if (s5.toLowerCase() === peg$c15) {
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e16);
                }
              }
            }
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseComparison();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f11(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseComparison() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseAddition();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.substr(peg$currPos, 2) === peg$c16) {
        s5 = peg$c16;
        peg$currPos += 2;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e17);
        }
      }
      if (s5 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c17) {
          s5 = peg$c17;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e18);
          }
        }
        if (s5 === peg$FAILED) {
          s5 = input.charAt(peg$currPos);
          if (peg$r0.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e19);
            }
          }
          if (s5 === peg$FAILED) {
            s5 = input.substr(peg$currPos, 2);
            if (s5.toLowerCase() === peg$c18) {
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e20);
              }
            }
            if (s5 === peg$FAILED) {
              s5 = input.substr(peg$currPos, 2);
              if (s5.toLowerCase() === peg$c19) {
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e21);
                }
              }
              if (s5 === peg$FAILED) {
                s5 = input.substr(peg$currPos, 2);
                if (s5.toLowerCase() === peg$c20) {
                  peg$currPos += 2;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e22);
                  }
                }
                if (s5 === peg$FAILED) {
                  s5 = input.substr(peg$currPos, 2);
                  if (s5.toLowerCase() === peg$c21) {
                    peg$currPos += 2;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e23);
                    }
                  }
                  if (s5 === peg$FAILED) {
                    s5 = input.substr(peg$currPos, 10);
                    if (s5.toLowerCase() === peg$c22) {
                      peg$currPos += 10;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e24);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseAddition();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.substr(peg$currPos, 2) === peg$c16) {
          s5 = peg$c16;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e17);
          }
        }
        if (s5 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c17) {
            s5 = peg$c17;
            peg$currPos += 2;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e18);
            }
          }
          if (s5 === peg$FAILED) {
            s5 = input.charAt(peg$currPos);
            if (peg$r0.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e19);
              }
            }
            if (s5 === peg$FAILED) {
              s5 = input.substr(peg$currPos, 2);
              if (s5.toLowerCase() === peg$c18) {
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
              if (s5 === peg$FAILED) {
                s5 = input.substr(peg$currPos, 2);
                if (s5.toLowerCase() === peg$c19) {
                  peg$currPos += 2;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e21);
                  }
                }
                if (s5 === peg$FAILED) {
                  s5 = input.substr(peg$currPos, 2);
                  if (s5.toLowerCase() === peg$c20) {
                    peg$currPos += 2;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e22);
                    }
                  }
                  if (s5 === peg$FAILED) {
                    s5 = input.substr(peg$currPos, 2);
                    if (s5.toLowerCase() === peg$c21) {
                      peg$currPos += 2;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e23);
                      }
                    }
                    if (s5 === peg$FAILED) {
                      s5 = input.substr(peg$currPos, 10);
                      if (s5.toLowerCase() === peg$c22) {
                        peg$currPos += 10;
                      } else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e24);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseAddition();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f12(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseAddition() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseMultiplication();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      s5 = input.charAt(peg$currPos);
      if (peg$r1.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e25);
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseMultiplication();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        s5 = input.charAt(peg$currPos);
        if (peg$r1.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseMultiplication();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f13(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseMultiplication() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseUnary();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      s5 = input.charAt(peg$currPos);
      if (peg$r2.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e26);
        }
      }
      if (s5 === peg$FAILED) {
        s5 = input.substr(peg$currPos, 3);
        if (s5.toLowerCase() === peg$c23) {
          peg$currPos += 3;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e27);
          }
        }
        if (s5 === peg$FAILED) {
          s5 = input.substr(peg$currPos, 3);
          if (s5.toLowerCase() === peg$c24) {
            peg$currPos += 3;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e28);
            }
          }
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseUnary();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        s5 = input.charAt(peg$currPos);
        if (peg$r2.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e26);
          }
        }
        if (s5 === peg$FAILED) {
          s5 = input.substr(peg$currPos, 3);
          if (s5.toLowerCase() === peg$c23) {
            peg$currPos += 3;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e27);
            }
          }
          if (s5 === peg$FAILED) {
            s5 = input.substr(peg$currPos, 3);
            if (s5.toLowerCase() === peg$c24) {
              peg$currPos += 3;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e28);
              }
            }
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseUnary();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f14(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseUnary() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 45) {
      s1 = peg$c25;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e29);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      s3 = peg$parseUnary();
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f15(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 33) {
        s1 = peg$c26;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e30);
        }
      }
      if (s1 === peg$FAILED) {
        s1 = input.substr(peg$currPos, 3);
        if (s1.toLowerCase() === peg$c27) {
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e31);
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        s3 = peg$parseUnary();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f16(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = input.substr(peg$currPos, 5);
        if (s1.toLowerCase() === peg$c28) {
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e32);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          s3 = peg$parseUnary();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f17(s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parseMemberExpression();
        }
      }
    }
    return s0;
  }
  function peg$parseMemberExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
    s0 = peg$currPos;
    s1 = peg$parsePrimary();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 46) {
        s5 = peg$c29;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e33);
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseIdentifier();
        if (s7 !== peg$FAILED) {
          peg$savedPos = s3;
          s3 = peg$f18(s1, s7);
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 91) {
          s5 = peg$c30;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e34);
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseTernary();
          if (s7 !== peg$FAILED) {
            s8 = peg$parse_();
            if (input.charCodeAt(peg$currPos) === 93) {
              s9 = peg$c31;
              peg$currPos++;
            } else {
              s9 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e35);
              }
            }
            if (s9 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f19(s1, s7);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (input.charCodeAt(peg$currPos) === 40) {
            s5 = peg$c32;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e36);
            }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            s7 = peg$parseArgumentList();
            if (s7 !== peg$FAILED) {
              s8 = peg$parse_();
              if (input.charCodeAt(peg$currPos) === 41) {
                s9 = peg$c33;
                peg$currPos++;
              } else {
                s9 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e37);
                }
              }
              if (s9 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f20(s1, s7);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 46) {
          s5 = peg$c29;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e33);
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseIdentifier();
          if (s7 !== peg$FAILED) {
            peg$savedPos = s3;
            s3 = peg$f18(s1, s7);
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (input.charCodeAt(peg$currPos) === 91) {
            s5 = peg$c30;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e34);
            }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            s7 = peg$parseTernary();
            if (s7 !== peg$FAILED) {
              s8 = peg$parse_();
              if (input.charCodeAt(peg$currPos) === 93) {
                s9 = peg$c31;
                peg$currPos++;
              } else {
                s9 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e35);
                }
              }
              if (s9 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f19(s1, s7);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$parse_();
            if (input.charCodeAt(peg$currPos) === 40) {
              s5 = peg$c32;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e36);
              }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              s7 = peg$parseArgumentList();
              if (s7 !== peg$FAILED) {
                s8 = peg$parse_();
                if (input.charCodeAt(peg$currPos) === 41) {
                  s9 = peg$c33;
                  peg$currPos++;
                } else {
                  s9 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e37);
                  }
                }
                if (s9 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s3 = peg$f20(s1, s7);
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
        }
      }
      peg$savedPos = s0;
      s0 = peg$f21(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseArgumentList() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseTernary();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 44) {
        s5 = peg$c34;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e38);
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseTernary();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c34;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e38);
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseTernary();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f22(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = '';
      peg$savedPos = s0;
      s1 = peg$f23();
      s0 = s1;
    }
    return s0;
  }
  function peg$parsePrimary() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$parseNullLiteral();
    if (s0 === peg$FAILED) {
      s0 = peg$parseBooleanLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parseNumberLiteral();
        if (s0 === peg$FAILED) {
          s0 = peg$parseStringLiteral();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 40) {
              s1 = peg$c32;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e36);
              }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              s3 = peg$parseTernary();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (input.charCodeAt(peg$currPos) === 41) {
                  s5 = peg$c33;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e37);
                  }
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f24(s3);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parseIdentifier();
            }
          }
        }
      }
    }
    return s0;
  }
  function peg$parseNullLiteral() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = input.substr(peg$currPos, 4);
    if (s1.toLowerCase() === peg$c35) {
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e39);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseIdentifierPart();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = undefined;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f25();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseBooleanLiteral() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = input.substr(peg$currPos, 4);
    if (s1.toLowerCase() === peg$c36) {
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e40);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseIdentifierPart();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = undefined;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f26();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = input.substr(peg$currPos, 5);
      if (s1.toLowerCase() === peg$c37) {
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e41);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = undefined;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f27();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseNumberLiteral() {
    var s0, s1;
    s0 = peg$currPos;
    s1 = peg$parseNumberText();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f28(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parseNumberText() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r3.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e43);
      }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r3.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e43);
          }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s3 = peg$c29;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e33);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = [];
        s5 = input.charAt(peg$currPos);
        if (peg$r3.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e43);
          }
        }
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r3.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e43);
            }
          }
        }
        s3 = [s3, s4];
        s2 = s3;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = peg$parseExponent();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f29(s1, s2, s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c29;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e33);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = input.charAt(peg$currPos);
        if (peg$r3.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e43);
          }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = input.charAt(peg$currPos);
            if (peg$r3.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e43);
              }
            }
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExponent();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f30(s2, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e42);
      }
    }
    return s0;
  }
  function peg$parseExponent() {
    var s0, s1, s2, s3, s4;
    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r4.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e44);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e25);
        }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r3.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e43);
        }
      }
      if (s4 !== peg$FAILED) {
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = input.charAt(peg$currPos);
          if (peg$r3.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e43);
            }
          }
        }
      } else {
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f31(s2, s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseStringLiteral() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 39) {
      s1 = peg$c38;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e45);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseSingleStringChar();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseSingleStringChar();
      }
      if (input.charCodeAt(peg$currPos) === 39) {
        s3 = peg$c38;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e45);
        }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f32(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c39;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e46);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseDoubleStringChar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseDoubleStringChar();
        }
        if (input.charCodeAt(peg$currPos) === 34) {
          s3 = peg$c39;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e46);
          }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f33(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseSingleStringChar() {
    var s0, s1;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c40) {
      s1 = peg$c40;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e47);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f34();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c5) {
        s1 = peg$c5;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e5);
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f35();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = input.charAt(peg$currPos);
        if (peg$r5.test(s0)) {
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e48);
          }
        }
      }
    }
    return s0;
  }
  function peg$parseDoubleStringChar() {
    var s0, s1;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c41) {
      s1 = peg$c41;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e49);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f36();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c5) {
        s1 = peg$c5;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e5);
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f37();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = input.charAt(peg$currPos);
        if (peg$r6.test(s0)) {
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e50);
          }
        }
      }
    }
    return s0;
  }
  function peg$parseIdentifier() {
    var s0, s1, s2, s3, s4;
    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    s2 = peg$parseReservedWord();
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = undefined;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseIdentifierStart();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$parseIdentifierPart();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parseIdentifierPart();
        }
        peg$savedPos = s0;
        s0 = peg$f38(s2, s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseIdentifierStart() {
    var s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r7.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e51);
      }
    }
    return s0;
  }
  function peg$parseIdentifierPart() {
    var s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r8.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e52);
      }
    }
    return s0;
  }
  function peg$parseReservedWord() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = input.substr(peg$currPos, 4);
    if (s1.toLowerCase() === peg$c36) {
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e40);
      }
    }
    if (s1 === peg$FAILED) {
      s1 = input.substr(peg$currPos, 5);
      if (s1.toLowerCase() === peg$c37) {
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e41);
        }
      }
      if (s1 === peg$FAILED) {
        s1 = input.substr(peg$currPos, 4);
        if (s1.toLowerCase() === peg$c35) {
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e39);
          }
        }
        if (s1 === peg$FAILED) {
          s1 = input.substr(peg$currPos, 5);
          if (s1.toLowerCase() === peg$c28) {
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e32);
            }
          }
          if (s1 === peg$FAILED) {
            s1 = input.substr(peg$currPos, 3);
            if (s1.toLowerCase() === peg$c27) {
              peg$currPos += 3;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e31);
              }
            }
            if (s1 === peg$FAILED) {
              s1 = input.substr(peg$currPos, 3);
              if (s1.toLowerCase() === peg$c11) {
                peg$currPos += 3;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e12);
                }
              }
              if (s1 === peg$FAILED) {
                s1 = input.substr(peg$currPos, 2);
                if (s1.toLowerCase() === peg$c9) {
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e10);
                  }
                }
                if (s1 === peg$FAILED) {
                  s1 = input.substr(peg$currPos, 2);
                  if (s1.toLowerCase() === peg$c14) {
                    peg$currPos += 2;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e15);
                    }
                  }
                  if (s1 === peg$FAILED) {
                    s1 = input.substr(peg$currPos, 2);
                    if (s1.toLowerCase() === peg$c15) {
                      peg$currPos += 2;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e16);
                      }
                    }
                    if (s1 === peg$FAILED) {
                      s1 = input.substr(peg$currPos, 2);
                      if (s1.toLowerCase() === peg$c18) {
                        peg$currPos += 2;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e20);
                        }
                      }
                      if (s1 === peg$FAILED) {
                        s1 = input.substr(peg$currPos, 2);
                        if (s1.toLowerCase() === peg$c19) {
                          peg$currPos += 2;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e21);
                          }
                        }
                        if (s1 === peg$FAILED) {
                          s1 = input.substr(peg$currPos, 2);
                          if (s1.toLowerCase() === peg$c20) {
                            peg$currPos += 2;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$e22);
                            }
                          }
                          if (s1 === peg$FAILED) {
                            s1 = input.substr(peg$currPos, 2);
                            if (s1.toLowerCase() === peg$c21) {
                              peg$currPos += 2;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) {
                                peg$fail(peg$e23);
                              }
                            }
                            if (s1 === peg$FAILED) {
                              s1 = input.substr(peg$currPos, 3);
                              if (s1.toLowerCase() === peg$c23) {
                                peg$currPos += 3;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                  peg$fail(peg$e27);
                                }
                              }
                              if (s1 === peg$FAILED) {
                                s1 = input.substr(peg$currPos, 3);
                                if (s1.toLowerCase() === peg$c24) {
                                  peg$currPos += 3;
                                } else {
                                  s1 = peg$FAILED;
                                  if (peg$silentFails === 0) {
                                    peg$fail(peg$e28);
                                  }
                                }
                                if (s1 === peg$FAILED) {
                                  s1 = input.substr(peg$currPos, 10);
                                  if (s1.toLowerCase() === peg$c22) {
                                    peg$currPos += 10;
                                  } else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                      peg$fail(peg$e24);
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseIdentifierPart();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = undefined;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parse_() {
    var s0, s1;
    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r9.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e54);
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r9.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e54);
        }
      }
    }
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e53);
    }
    return s0;
  }
  function loc() {
    return location();
  }
  peg$result = peg$startRuleFunction();
  if (options.peg$library) {
    return /** @type {any} */{
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos
    };
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
  }
}
const peg$allowedStartRules = ["Start"];


/***/ },

/***/ "./node_modules/camunda-modeler-plugin-helpers/index.js"
/*!**************************************************************!*\
  !*** ./node_modules/camunda-modeler-plugin-helpers/index.js ***!
  \**************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getModelerDirectory: () => (/* binding */ getModelerDirectory),
/* harmony export */   getPluginsDirectory: () => (/* binding */ getPluginsDirectory),
/* harmony export */   registerBpmnJSModdleExtension: () => (/* binding */ registerBpmnJSModdleExtension),
/* harmony export */   registerBpmnJSPlugin: () => (/* binding */ registerBpmnJSPlugin),
/* harmony export */   registerClientExtension: () => (/* binding */ registerClientExtension),
/* harmony export */   registerClientPlugin: () => (/* binding */ registerClientPlugin),
/* harmony export */   registerCloudBpmnJSModdleExtension: () => (/* binding */ registerCloudBpmnJSModdleExtension),
/* harmony export */   registerCloudBpmnJSPlugin: () => (/* binding */ registerCloudBpmnJSPlugin),
/* harmony export */   registerCloudDmnJSModdleExtension: () => (/* binding */ registerCloudDmnJSModdleExtension),
/* harmony export */   registerCloudDmnJSPlugin: () => (/* binding */ registerCloudDmnJSPlugin),
/* harmony export */   registerDmnJSModdleExtension: () => (/* binding */ registerDmnJSModdleExtension),
/* harmony export */   registerDmnJSPlugin: () => (/* binding */ registerDmnJSPlugin),
/* harmony export */   registerPlatformBpmnJSModdleExtension: () => (/* binding */ registerPlatformBpmnJSModdleExtension),
/* harmony export */   registerPlatformBpmnJSPlugin: () => (/* binding */ registerPlatformBpmnJSPlugin),
/* harmony export */   registerPlatformDmnJSModdleExtension: () => (/* binding */ registerPlatformDmnJSModdleExtension),
/* harmony export */   registerPlatformDmnJSPlugin: () => (/* binding */ registerPlatformDmnJSPlugin)
/* harmony export */ });
/**
 * Validate and register a client plugin.
 *
 * @param {Object} plugin
 * @param {String} type
 */
function registerClientPlugin(plugin, type) {
  var plugins = window.plugins || [];
  window.plugins = plugins;

  if (!plugin) {
    throw new Error('plugin not specified');
  }

  if (!type) {
    throw new Error('type not specified');
  }

  plugins.push({
    plugin: plugin,
    type: type
  });
}

/**
 * Validate and register a client plugin.
 *
 * @param {import('react').ComponentType} extension
 *
 * @example
 *
 * import MyExtensionComponent from './MyExtensionComponent';
 *
 * registerClientExtension(MyExtensionComponent);
 */
function registerClientExtension(component) {
  registerClientPlugin(component, 'client');
}

/**
 * Validate and register a bpmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerBpmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const BpmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerBpmnJSPlugin(BpmnJSModule);
 */
function registerBpmnJSPlugin(module) {
  registerClientPlugin(module, 'bpmn.modeler.additionalModules');
}

/**
 * Validate and register a platform specific bpmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerPlatformBpmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const BpmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerPlatformBpmnJSPlugin(BpmnJSModule);
 */
function registerPlatformBpmnJSPlugin(module) {
  registerClientPlugin(module, 'bpmn.platform.modeler.additionalModules');
}

/**
 * Validate and register a cloud specific bpmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerCloudBpmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const BpmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerCloudBpmnJSPlugin(BpmnJSModule);
 */
function registerCloudBpmnJSPlugin(module) {
  registerClientPlugin(module, 'bpmn.cloud.modeler.additionalModules');
}

/**
 * Validate and register a bpmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerBpmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerBpmnJSModdleExtension(moddleDescriptor);
 */
function registerBpmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'bpmn.modeler.moddleExtension');
}

/**
 * Validate and register a platform specific bpmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerPlatformBpmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerPlatformBpmnJSModdleExtension(moddleDescriptor);
 */
function registerPlatformBpmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'bpmn.platform.modeler.moddleExtension');
}

/**
 * Validate and register a cloud specific bpmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerCloudBpmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerCloudBpmnJSModdleExtension(moddleDescriptor);
 */
function registerCloudBpmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'bpmn.cloud.modeler.moddleExtension');
}

/**
 * Validate and register a dmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerDmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerDmnJSModdleExtension(moddleDescriptor);
 */
function registerDmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'dmn.modeler.moddleExtension');
}

/**
 * Validate and register a cloud specific dmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerCloudDmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerCloudDmnJSModdleExtension(moddleDescriptor);
 */
function registerCloudDmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'dmn.cloud.modeler.moddleExtension');
}

/**
 * Validate and register a platform specific dmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerPlatformDmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerPlatformDmnJSModdleExtension(moddleDescriptor);
 */
function registerPlatformDmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'dmn.platform.modeler.moddleExtension');
}

/**
 * Validate and register a dmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerDmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const DmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerDmnJSPlugin(DmnJSModule, [ 'drd', 'literalExpression' ]);
 * registerDmnJSPlugin(DmnJSModule, 'drd')
 */
function registerDmnJSPlugin(module, components) {

  if (!Array.isArray(components)) {
    components = [ components ]
  }

  components.forEach(c => registerClientPlugin(module, `dmn.modeler.${c}.additionalModules`));
}

/**
 * Validate and register a cloud specific dmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerCloudDmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const DmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerCloudDmnJSPlugin(DmnJSModule, [ 'drd', 'literalExpression' ]);
 * registerCloudDmnJSPlugin(DmnJSModule, 'drd')
 */
function registerCloudDmnJSPlugin(module, components) {

  if (!Array.isArray(components)) {
    components = [ components ]
  }

  components.forEach(c => registerClientPlugin(module, `dmn.cloud.modeler.${c}.additionalModules`));
}

/**
 * Validate and register a platform specific dmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerPlatformDmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const DmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerPlatformDmnJSPlugin(DmnJSModule, [ 'drd', 'literalExpression' ]);
 * registerPlatformDmnJSPlugin(DmnJSModule, 'drd')
 */
function registerPlatformDmnJSPlugin(module, components) {

  if (!Array.isArray(components)) {
    components = [ components ]
  }

  components.forEach(c => registerClientPlugin(module, `dmn.platform.modeler.${c}.additionalModules`));
}

/**
 * Return the modeler directory, as a string.
 *
 * @deprecated Will be removed in future Camunda Modeler versions without replacement.
 *
 * @return {String}
 */
function getModelerDirectory() {
  return window.getModelerDirectory();
}

/**
 * Return the modeler plugin directory, as a string.
 *
 * @deprecated Will be removed in future Camunda Modeler versions without replacement.
 *
 * @return {String}
 */
function getPluginsDirectory() {
  return window.getPluginsDirectory();
}

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var camunda_modeler_plugin_helpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! camunda-modeler-plugin-helpers */ "./node_modules/camunda-modeler-plugin-helpers/index.js");
/* harmony import */ var _ExpressionAssistPlugin__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ExpressionAssistPlugin */ "./src/ExpressionAssistPlugin.js");


const ExpressionAssistModule = {
  __init__: ['expressionAssistPlugin'],
  expressionAssistPlugin: ['type', _ExpressionAssistPlugin__WEBPACK_IMPORTED_MODULE_1__["default"]]
};
(0,camunda_modeler_plugin_helpers__WEBPACK_IMPORTED_MODULE_0__.registerPlatformBpmnJSPlugin)(ExpressionAssistModule);
})();

/******/ })()
;
//# sourceMappingURL=client.js.map