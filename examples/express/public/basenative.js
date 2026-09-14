// ../../packages/runtime/src/signals.js
var currentEffect = null;
var batchDepth = 0;
var pendingEffects = /* @__PURE__ */ new Set();
var plugins = [];
function cleanupEffect(effectRef) {
  for (const subscribers of effectRef.subscriptions) {
    subscribers.delete(effectRef);
  }
  effectRef.subscriptions.clear();
  if (typeof effectRef.cleanup === "function") {
    const cleanup = effectRef.cleanup;
    effectRef.cleanup = null;
    cleanup();
  }
}
function scheduleEffect(effectRef) {
  if (batchDepth > 0) {
    pendingEffects.add(effectRef);
  } else {
    effectRef.run();
  }
}
function flushEffects() {
  batchDepth++;
  try {
    while (pendingEffects.size > 0) {
      const effects = [...pendingEffects];
      pendingEffects.clear();
      for (const effectRef of effects) effectRef.run();
    }
  } finally {
    batchDepth--;
  }
}
function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushEffects();
  }
}
function signal(initial) {
  let value = initial;
  const subs = /* @__PURE__ */ new Set();
  const accessor = () => {
    if (currentEffect) {
      subs.add(currentEffect);
      currentEffect.subscriptions.add(subs);
    }
    return value;
  };
  accessor.set = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    if (resolved !== value) {
      const prev = value;
      value = resolved;
      for (const plugin of plugins) {
        if (plugin.onSignalWrite) plugin.onSignalWrite(accessor, prev, value);
      }
      for (const effectRef of [...subs]) scheduleEffect(effectRef);
    }
  };
  accessor.peek = () => value;
  return accessor;
}
function computed(fn) {
  const s = signal(void 0);
  effect(() => s.set(fn()));
  return s;
}
function registerPlugin(plugin) {
  plugins.push(plugin);
  return () => {
    const idx = plugins.indexOf(plugin);
    if (idx !== -1) plugins.splice(idx, 1);
  };
}
function effect(fn) {
  const effectRef = {
    cleanup: null,
    disposed: false,
    subscriptions: /* @__PURE__ */ new Set(),
    run() {
      if (effectRef.disposed) return;
      cleanupEffect(effectRef);
      const previous = currentEffect;
      currentEffect = effectRef;
      try {
        const cleanup = fn();
        effectRef.cleanup = typeof cleanup === "function" ? cleanup : null;
      } finally {
        currentEffect = previous;
      }
    }
  };
  const execute = () => {
    effectRef.run();
  };
  execute.dispose = () => {
    if (effectRef.disposed) return;
    effectRef.disposed = true;
    cleanupEffect(effectRef);
  };
  execute();
  return execute;
}

// ../../packages/runtime/src/shared/expression.js
var SCOPE_SLOT = /* @__PURE__ */ Symbol.for("basenative.scopeSlot");
var EXPRESSION_CACHE = /* @__PURE__ */ new Map();
var UNSAFE_PROPERTIES = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function createExpressionError(code, message, source, index = 0) {
  const error = new SyntaxError(message);
  error.code = code;
  error.source = source;
  error.index = index;
  return error;
}
function reportDiagnostic(options, diagnostic) {
  if (typeof options?.onDiagnostic === "function") {
    options.onDiagnostic(diagnostic);
  }
}
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    const tri = source.slice(index, index + 3);
    const duo = source.slice(index, index + 2);
    if (tri === "===" || tri === "!==") {
      tokens.push({ type: "operator", value: tri, index });
      index += 3;
      continue;
    }
    if (duo === "&&" || duo === "||" || duo === "==" || duo === "!=" || duo === "<=" || duo === ">=") {
      tokens.push({ type: "operator", value: duo, index });
      index += 2;
      continue;
    }
    if ("()[]{}.,:;?".includes(char)) {
      tokens.push({ type: "punct", value: char, index });
      index++;
      continue;
    }
    if ("+-*/%!<>".includes(char)) {
      tokens.push({ type: "operator", value: char, index });
      index++;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      const start = index;
      index++;
      let value = "";
      while (index < source.length) {
        const current = source[index];
        if (current === "\\") {
          const next = source[index + 1];
          if (next == null) break;
          const escapeMap = {
            '"': '"',
            "'": "'",
            "\\": "\\",
            n: "\n",
            r: "\r",
            t: "	"
          };
          value += escapeMap[next] ?? next;
          index += 2;
          continue;
        }
        if (current === quote) {
          index++;
          tokens.push({ type: "string", value, index: start });
          value = null;
          break;
        }
        value += current;
        index++;
      }
      if (value !== null) {
        throw createExpressionError(
          "BN_EXPR_UNTERMINATED_STRING",
          "Unterminated string literal",
          source,
          start
        );
      }
      continue;
    }
    if (/[0-9]/.test(char)) {
      const start = index;
      let raw2 = char;
      index++;
      while (index < source.length && /[0-9.]/.test(source[index])) {
        raw2 += source[index];
        index++;
      }
      if (!/^(\d+|\d+\.\d+)$/.test(raw2)) {
        throw createExpressionError(
          "BN_EXPR_INVALID_NUMBER",
          `Invalid numeric literal "${raw2}"`,
          source,
          start
        );
      }
      tokens.push({ type: "number", value: Number(raw2), index: start });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      let value = char;
      index++;
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) {
        value += source[index];
        index++;
      }
      tokens.push({ type: "identifier", value, index: start });
      continue;
    }
    throw createExpressionError(
      "BN_EXPR_INVALID_TOKEN",
      `Unsupported token "${char}"`,
      source,
      index
    );
  }
  tokens.push({ type: "eof", value: "", index: source.length });
  return tokens;
}
var Parser = class {
  constructor(tokens, source) {
    this.tokens = tokens;
    this.source = source;
    this.index = 0;
  }
  current() {
    return this.tokens[this.index];
  }
  advance() {
    const token = this.current();
    this.index++;
    return token;
  }
  match(type, value) {
    const token = this.current();
    if (!token || token.type !== type) return false;
    if (value != null && token.value !== value) return false;
    this.index++;
    return true;
  }
  expect(type, value, message) {
    const token = this.current();
    if (token?.type === type && (value == null || token.value === value)) {
      this.index++;
      return token;
    }
    throw createExpressionError(
      "BN_EXPR_UNEXPECTED_TOKEN",
      message ?? `Unexpected token "${token?.value ?? "EOF"}"`,
      this.source,
      token?.index ?? this.source.length
    );
  }
  parseProgram() {
    const body = [];
    while (this.current().type !== "eof") {
      if (this.match("punct", ";")) continue;
      body.push(this.parseExpression());
      this.match("punct", ";");
    }
    return { type: "Program", body };
  }
  parseExpression() {
    return this.parseConditional();
  }
  parseConditional() {
    const test = this.parseLogicalOr();
    if (!this.match("punct", "?")) return test;
    const consequent = this.parseExpression();
    this.expect("punct", ":", 'Expected ":" in conditional expression');
    const alternate = this.parseExpression();
    return { type: "ConditionalExpression", test, consequent, alternate };
  }
  parseLogicalOr() {
    let node = this.parseLogicalAnd();
    while (this.match("operator", "||")) {
      node = {
        type: "LogicalExpression",
        operator: "||",
        left: node,
        right: this.parseLogicalAnd()
      };
    }
    return node;
  }
  parseLogicalAnd() {
    let node = this.parseEquality();
    while (this.match("operator", "&&")) {
      node = {
        type: "LogicalExpression",
        operator: "&&",
        left: node,
        right: this.parseEquality()
      };
    }
    return node;
  }
  parseEquality() {
    let node = this.parseRelational();
    while (true) {
      if (this.match("operator", "===")) {
        node = {
          type: "BinaryExpression",
          operator: "===",
          left: node,
          right: this.parseRelational()
        };
        continue;
      }
      if (this.match("operator", "!==")) {
        node = {
          type: "BinaryExpression",
          operator: "!==",
          left: node,
          right: this.parseRelational()
        };
        continue;
      }
      if (this.match("operator", "==")) {
        node = {
          type: "BinaryExpression",
          operator: "==",
          left: node,
          right: this.parseRelational()
        };
        continue;
      }
      if (this.match("operator", "!=")) {
        node = {
          type: "BinaryExpression",
          operator: "!=",
          left: node,
          right: this.parseRelational()
        };
        continue;
      }
      return node;
    }
  }
  parseRelational() {
    let node = this.parseAdditive();
    while (true) {
      if (this.match("operator", "<=")) {
        node = {
          type: "BinaryExpression",
          operator: "<=",
          left: node,
          right: this.parseAdditive()
        };
        continue;
      }
      if (this.match("operator", ">=")) {
        node = {
          type: "BinaryExpression",
          operator: ">=",
          left: node,
          right: this.parseAdditive()
        };
        continue;
      }
      if (this.match("operator", "<")) {
        node = {
          type: "BinaryExpression",
          operator: "<",
          left: node,
          right: this.parseAdditive()
        };
        continue;
      }
      if (this.match("operator", ">")) {
        node = {
          type: "BinaryExpression",
          operator: ">",
          left: node,
          right: this.parseAdditive()
        };
        continue;
      }
      return node;
    }
  }
  parseAdditive() {
    let node = this.parseMultiplicative();
    while (true) {
      if (this.match("operator", "+")) {
        node = {
          type: "BinaryExpression",
          operator: "+",
          left: node,
          right: this.parseMultiplicative()
        };
        continue;
      }
      if (this.match("operator", "-")) {
        node = {
          type: "BinaryExpression",
          operator: "-",
          left: node,
          right: this.parseMultiplicative()
        };
        continue;
      }
      return node;
    }
  }
  parseMultiplicative() {
    let node = this.parseUnary();
    while (true) {
      if (this.match("operator", "*")) {
        node = {
          type: "BinaryExpression",
          operator: "*",
          left: node,
          right: this.parseUnary()
        };
        continue;
      }
      if (this.match("operator", "/")) {
        node = {
          type: "BinaryExpression",
          operator: "/",
          left: node,
          right: this.parseUnary()
        };
        continue;
      }
      if (this.match("operator", "%")) {
        node = {
          type: "BinaryExpression",
          operator: "%",
          left: node,
          right: this.parseUnary()
        };
        continue;
      }
      return node;
    }
  }
  parseUnary() {
    if (this.match("operator", "!")) {
      return { type: "UnaryExpression", operator: "!", argument: this.parseUnary() };
    }
    if (this.match("operator", "+")) {
      return { type: "UnaryExpression", operator: "+", argument: this.parseUnary() };
    }
    if (this.match("operator", "-")) {
      return { type: "UnaryExpression", operator: "-", argument: this.parseUnary() };
    }
    return this.parsePostfix();
  }
  parsePostfix() {
    let node = this.parsePrimary();
    while (true) {
      if (this.match("punct", ".")) {
        const property = this.expect(
          "identifier",
          null,
          'Expected a property name after "."'
        );
        node = {
          type: "MemberExpression",
          object: node,
          property: { type: "Identifier", name: property.value },
          computed: false
        };
        continue;
      }
      if (this.match("punct", "[")) {
        const property = this.parseExpression();
        this.expect("punct", "]", 'Expected "]" after computed property');
        node = {
          type: "MemberExpression",
          object: node,
          property,
          computed: true
        };
        continue;
      }
      if (this.match("punct", "(")) {
        const args = [];
        if (!this.match("punct", ")")) {
          do {
            args.push(this.parseExpression());
          } while (this.match("punct", ","));
          this.expect("punct", ")", 'Expected ")" after function arguments');
        }
        node = { type: "CallExpression", callee: node, arguments: args };
        continue;
      }
      return node;
    }
  }
  parsePrimary() {
    const token = this.current();
    if (token.type === "number") {
      this.advance();
      return { type: "Literal", value: token.value };
    }
    if (token.type === "string") {
      this.advance();
      return { type: "Literal", value: token.value };
    }
    if (token.type === "identifier") {
      this.advance();
      if (token.value === "true") return { type: "Literal", value: true };
      if (token.value === "false") return { type: "Literal", value: false };
      if (token.value === "null") return { type: "Literal", value: null };
      if (token.value === "undefined") return { type: "Literal", value: void 0 };
      return { type: "Identifier", name: token.value };
    }
    if (this.match("punct", "(")) {
      const node = this.parseExpression();
      this.expect("punct", ")", 'Expected ")" after grouped expression');
      return node;
    }
    if (this.match("punct", "[")) {
      const elements = [];
      if (!this.match("punct", "]")) {
        do {
          elements.push(this.parseExpression());
        } while (this.match("punct", ","));
        this.expect("punct", "]", 'Expected "]" after array literal');
      }
      return { type: "ArrayExpression", elements };
    }
    if (this.match("punct", "{")) {
      const properties = [];
      if (!this.match("punct", "}")) {
        do {
          const keyToken = this.current();
          let key;
          if (keyToken.type === "identifier") {
            this.advance();
            key = keyToken.value;
          } else if (keyToken.type === "string" || keyToken.type === "number") {
            this.advance();
            key = String(keyToken.value);
          } else {
            throw createExpressionError(
              "BN_EXPR_INVALID_OBJECT_KEY",
              "Expected an object property name",
              this.source,
              keyToken.index
            );
          }
          let value;
          if (this.match("punct", ":")) {
            value = this.parseExpression();
          } else {
            value = { type: "Identifier", name: key };
          }
          properties.push({ key, value });
        } while (this.match("punct", ","));
        this.expect("punct", "}", 'Expected "}" after object literal');
      }
      return { type: "ObjectExpression", properties };
    }
    throw createExpressionError(
      "BN_EXPR_UNEXPECTED_TOKEN",
      `Unexpected token "${token.value}"`,
      this.source,
      token.index
    );
  }
};
function isScopeSlot(value) {
  return Boolean(value) && value[SCOPE_SLOT] === true && typeof value.get === "function";
}
function resolveValue(value) {
  return isScopeSlot(value) ? value.get() : value;
}
function lookupIdentifier(ctx, name) {
  if (ctx == null) return void 0;
  return resolveValue(ctx[name]);
}
function safeMemberRead(object, property, source) {
  if (typeof property === "symbol") {
    return object[property];
  }
  if (property !== null && typeof property === "object") {
    throw createExpressionError(
      "BN_EXPR_UNSAFE_MEMBER",
      "Computed property keys must be a string or a number in BaseNative expressions",
      source
    );
  }
  const key = String(property);
  if (UNSAFE_PROPERTIES.has(key)) {
    throw createExpressionError(
      "BN_EXPR_UNSAFE_MEMBER",
      `Access to "${key}" is not allowed in BaseNative expressions`,
      source
    );
  }
  return object[key];
}
function evaluateNode(node, ctx, source) {
  switch (node.type) {
    case "Program": {
      let result;
      for (const statement of node.body) result = evaluateNode(statement, ctx, source);
      return result;
    }
    case "Literal":
      return node.value;
    case "Identifier":
      return lookupIdentifier(ctx, node.name);
    case "UnaryExpression": {
      const value = evaluateNode(node.argument, ctx, source);
      if (node.operator === "!") return !value;
      if (node.operator === "+") return +value;
      if (node.operator === "-") return -value;
      return void 0;
    }
    case "BinaryExpression": {
      const left = evaluateNode(node.left, ctx, source);
      const right = evaluateNode(node.right, ctx, source);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
          return left % right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case ">=":
          return left >= right;
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case "===":
          return left === right;
        case "!==":
          return left !== right;
        default:
          return void 0;
      }
    }
    case "LogicalExpression":
      return node.operator === "&&" ? evaluateNode(node.left, ctx, source) && evaluateNode(node.right, ctx, source) : evaluateNode(node.left, ctx, source) || evaluateNode(node.right, ctx, source);
    case "ConditionalExpression":
      return evaluateNode(node.test, ctx, source) ? evaluateNode(node.consequent, ctx, source) : evaluateNode(node.alternate, ctx, source);
    case "ArrayExpression":
      return node.elements.map((element) => evaluateNode(element, ctx, source));
    case "ObjectExpression": {
      const result = {};
      for (const property of node.properties) {
        result[property.key] = evaluateNode(property.value, ctx, source);
      }
      return result;
    }
    case "MemberExpression": {
      const object = evaluateNode(node.object, ctx, source);
      if (object == null) return void 0;
      const property = node.computed ? evaluateNode(node.property, ctx, source) : node.property.name;
      return safeMemberRead(object, property, source);
    }
    case "CallExpression": {
      if (node.callee.type === "MemberExpression") {
        const target = evaluateNode(node.callee.object, ctx, source);
        if (target == null) return void 0;
        const property = node.callee.computed ? evaluateNode(node.callee.property, ctx, source) : node.callee.property.name;
        const fn2 = safeMemberRead(target, property, source);
        if (typeof fn2 !== "function") return void 0;
        const args2 = node.arguments.map((arg) => evaluateNode(arg, ctx, source));
        return fn2.apply(target, args2);
      }
      const fn = evaluateNode(node.callee, ctx, source);
      if (typeof fn !== "function") return void 0;
      const args = node.arguments.map((arg) => evaluateNode(arg, ctx, source));
      return fn(...args);
    }
    default:
      return void 0;
  }
}
function compileExpression(source) {
  const normalized = String(source ?? "").trim();
  if (EXPRESSION_CACHE.has(normalized)) return EXPRESSION_CACHE.get(normalized);
  try {
    const parser = new Parser(tokenize(normalized), normalized);
    const compiled = { source: normalized, ast: parser.parseProgram() };
    EXPRESSION_CACHE.set(normalized, compiled);
    return compiled;
  } catch (error) {
    const failure = { source: normalized, error };
    EXPRESSION_CACHE.set(normalized, failure);
    return failure;
  }
}
function evaluateExpression(source, ctx = {}, options = {}) {
  const compiled = typeof source === "string" ? compileExpression(source) : source;
  if (compiled?.error) {
    reportDiagnostic(options, {
      level: "error",
      domain: "expression",
      code: compiled.error.code ?? "BN_EXPR_COMPILE_FAILED",
      message: compiled.error.message,
      expression: compiled.source,
      error: compiled.error
    });
    return void 0;
  }
  try {
    return evaluateNode(compiled.ast, ctx, compiled.source);
  } catch (error) {
    reportDiagnostic(options, {
      level: "error",
      domain: "expression",
      code: error.code ?? "BN_EXPR_EVALUATION_FAILED",
      message: error.message,
      expression: compiled.source,
      error
    });
    return void 0;
  }
}

// ../../packages/runtime/src/shared/escape.js
var RAW = /* @__PURE__ */ Symbol.for("basenative.raw");
function raw(value) {
  return { [RAW]: true, value: String(value ?? "") };
}
function isRaw(value) {
  return Boolean(value && typeof value === "object" && value[RAW]);
}
function unwrapRaw(value) {
  return isRaw(value) ? value.value : value;
}
function escapeText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var URL_ATTRIBUTES = /* @__PURE__ */ new Set([
  "href",
  "src",
  "action",
  "formaction",
  "data",
  "poster",
  "xlink:href",
  "ping",
  "background",
  "srcdoc",
  "codebase"
]);
var DANGEROUS_SCHEME = /^(?:javascript|vbscript|data|blob|file):/i;
function isUrlAttribute(name) {
  return URL_ATTRIBUTES.has(String(name).toLowerCase());
}
function sanitizeUrl(value) {
  const stripped = String(value).replace(/[\u0000-\u0020\u007F-\u00A0]/g, "");
  return DANGEROUS_SCHEME.test(stripped) ? null : String(value);
}
function findInterpolations(text) {
  const out = [];
  let from = 0;
  for (; ; ) {
    const start = text.indexOf("{{", from);
    if (start === -1) break;
    const end = text.indexOf("}}", start + 2);
    if (end === -1) break;
    const expression = text.slice(start + 2, end).trim();
    if (expression.length > 0) {
      out.push({ start, end: end + 2, expression });
    }
    from = end + 2;
  }
  return out;
}

// ../../packages/runtime/src/evaluate.js
function evaluate(expr, ctx, options) {
  return evaluateExpression(expr, ctx, options);
}
function interpolate(text, ctx, options) {
  const parts = [];
  let sawRaw = false;
  let last = 0;
  for (const { start, end, expression } of findInterpolations(text)) {
    parts.push({ literal: text.slice(last, start) });
    const val = evaluate(expression, ctx, options);
    if (isRaw(val)) sawRaw = true;
    parts.push({ value: val });
    last = end;
  }
  parts.push({ literal: text.slice(last) });
  if (!sawRaw) {
    return parts.map((p) => "literal" in p ? p.literal : p.value != null ? String(p.value) : "").join("");
  }
  return raw(
    parts.map((p) => {
      if ("literal" in p) return escapeText(p.literal);
      if (p.value == null) return "";
      return isRaw(p.value) ? unwrapRaw(p.value) : escapeText(p.value);
    }).join("")
  );
}

// ../../packages/runtime/src/dom-lifecycle.js
var CLEANUPS = /* @__PURE__ */ Symbol("basenative.cleanups");
function registerCleanup(node, cleanup) {
  if (!node || typeof cleanup !== "function") return cleanup;
  if (!node[CLEANUPS]) node[CLEANUPS] = [];
  node[CLEANUPS].push(cleanup);
  return cleanup;
}
function disposeNodeTree(node) {
  if (!node) return;
  if (node.childNodes?.length) {
    for (const child of [...node.childNodes]) {
      disposeNodeTree(child);
    }
  }
  const cleanups = node[CLEANUPS];
  if (!cleanups?.length) return;
  while (cleanups.length) {
    const cleanup = cleanups.pop();
    cleanup();
  }
}
function removeNodeTree(node) {
  if (!node) return;
  disposeNodeTree(node);
  node.remove();
}
function removeNodeRange(start, end) {
  let node = start;
  while (node) {
    const current = node;
    node = node.nextSibling;
    removeNodeTree(current);
    if (current === end) break;
  }
}

// ../../packages/runtime/src/scope.js
function createScopeSlot(initial) {
  const state = signal(initial);
  return {
    [SCOPE_SLOT]: true,
    get() {
      return state();
    },
    set(value) {
      state.set(value);
    },
    peek() {
      return state.peek();
    }
  };
}
function createChildContext(parent, bindings = {}) {
  return Object.assign(Object.create(parent ?? null), bindings);
}
function createLoopContext(parent, itemName, item, index, length) {
  const slots = {
    [itemName]: createScopeSlot(item),
    $index: createScopeSlot(index),
    $first: createScopeSlot(index === 0),
    $last: createScopeSlot(index === length - 1),
    $even: createScopeSlot(index % 2 === 0),
    $odd: createScopeSlot(index % 2 !== 0)
  };
  return {
    ctx: createChildContext(parent, slots),
    slots
  };
}
function updateLoopContext(slots, itemName, item, index, length) {
  slots[itemName].set(item);
  slots.$index.set(index);
  slots.$first.set(index === 0);
  slots.$last.set(index === length - 1);
  slots.$even.set(index % 2 === 0);
  slots.$odd.set(index % 2 !== 0);
}

// ../../packages/runtime/src/shared/directives.js
var registry = /* @__PURE__ */ new Map();
function registerDirective(name, config = {}) {
  if (typeof name !== "string" || name === "") {
    throw new Error("registerDirective: name must be a non-empty string.");
  }
  if (registry.has(name)) {
    throw new Error(`Directive "@${name}" is already registered.`);
  }
  if (typeof config.server !== "function" && typeof config.client !== "function") {
    throw new Error(`Directive "@${name}" needs a "server" and/or "client" handler function.`);
  }
  registry.set(name, {
    on: config.on === "template" ? "template" : "element",
    server: typeof config.server === "function" ? config.server : void 0,
    client: typeof config.client === "function" ? config.client : void 0
  });
}
function unregisterDirective(name) {
  registry.delete(name);
}
function getDirective(name) {
  return registry.get(name);
}
function listDirectives() {
  return [...registry.keys()];
}

// ../../packages/runtime/src/bind.js
function bindNode(node, ctx, options) {
  let processed = 0;
  if (node.nodeType === Node.TEXT_NODE) {
    const source = node.textContent;
    if (source.includes("{{")) {
      const runner = effect(() => {
        const result = interpolate(source, ctx, options);
        if (isRaw(result)) node.innerHTML = unwrapRaw(result);
        else node.textContent = result;
      });
      registerCleanup(node, () => runner.dispose?.());
      processed++;
    }
    return processed;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === "TEMPLATE") return processed;
  for (const attr of [...node.attributes]) {
    if (attr.name.startsWith("@")) {
      const directive = getDirective(attr.name.slice(1));
      if (directive?.on === "element" && directive.client) {
        const value = attr.value;
        const runner = effect(() => {
          const result = directive.client(value, ctx, options);
          if (result === void 0) return;
          if (isRaw(result)) node.innerHTML = unwrapRaw(result);
          else node.textContent = result == null ? "" : String(result);
        });
        registerCleanup(node, () => runner.dispose?.());
        node.removeAttribute(attr.name);
        processed++;
        continue;
      }
      const event = attr.name.slice(1);
      const body = attr.value.trim();
      const handler = function($event) {
        const handlerCtx = createChildContext(ctx, {
          $el: this,
          $event
        });
        evaluate(body, handlerCtx, options);
      };
      node.addEventListener(event, handler);
      registerCleanup(node, () => node.removeEventListener(event, handler));
      node.removeAttribute(attr.name);
      processed++;
    } else if (attr.name.startsWith(":")) {
      const attrName = attr.name.slice(1);
      const expr = attr.value;
      const runner = effect(() => {
        const result = evaluate(expr, ctx, options);
        if (result === false || result == null) {
          node.removeAttribute(attrName);
          return;
        }
        const resolved = unwrapRaw(result);
        if (isUrlAttribute(attrName) && sanitizeUrl(resolved) === null) {
          node.removeAttribute(attrName);
          return;
        }
        node.setAttribute(attrName, resolved);
      });
      registerCleanup(node, () => runner.dispose?.());
      node.removeAttribute(attr.name);
      processed++;
    } else if (attr.value.includes("{{")) {
      const raw2 = attr.value;
      const name = attr.name;
      const runner = effect(() => {
        node.setAttribute(name, interpolate(raw2, ctx, options));
      });
      registerCleanup(node, () => runner.dispose?.());
      processed++;
    }
  }
  processed += hydrateChildren(node, ctx, options);
  return processed;
}

// ../../packages/runtime/src/diagnostics.js
function logDiagnostic(diagnostic) {
  const method = diagnostic.level === "error" ? "error" : "warn";
  console[method]?.(`[BaseNative:${diagnostic.code}] ${diagnostic.message}`, diagnostic);
}
function createRuntimeOptions(options = {}) {
  return {
    dev: options.dev === true,
    recover: options.recover ?? "client",
    onDiagnostic: options.onDiagnostic,
    onMismatch: options.onMismatch
  };
}
function emitDiagnostic(options, diagnostic) {
  if (typeof options?.onDiagnostic === "function") {
    options.onDiagnostic(diagnostic);
  } else if (options?.dev) {
    logDiagnostic(diagnostic);
  }
}
function reportHydrationMismatch(options, message, detail = {}) {
  const diagnostic = {
    level: "warn",
    domain: "hydration",
    code: detail.code ?? "BN_HYDRATE_MISMATCH",
    message,
    detail
  };
  if (typeof options?.onMismatch === "function") {
    options.onMismatch(diagnostic);
  }
  emitDiagnostic(options, diagnostic);
  if (options?.recover === "throw") {
    throw new Error(`[${diagnostic.code}] ${diagnostic.message}`);
  }
}

// ../../packages/runtime/src/hydrate.js
function insertAfterAnchor(anchor, nodes) {
  let ref = anchor;
  for (const node of nodes) {
    ref.after(node);
    ref = node;
  }
}
function removeRenderedNodes(nodes) {
  for (const node of nodes) {
    removeNodeTree(node);
  }
}
function cloneAndHydrate(template, ctx, options) {
  const fragment = template.content.cloneNode(true);
  hydrateChildren(fragment, ctx, options);
  return [...fragment.childNodes];
}
function createBlock(template, ctx, options, label = "@for:item") {
  const fragment = document.createDocumentFragment();
  const start = document.createComment(label);
  const end = document.createComment(`${label}:end`);
  const nodes = cloneAndHydrate(template, ctx, options);
  fragment.append(start);
  for (const node of nodes) fragment.append(node);
  fragment.append(end);
  return { start, end, fragment, ctx };
}
function extractBlockRange(block) {
  const fragment = document.createDocumentFragment();
  let node = block.start;
  while (node) {
    const current = node;
    node = node.nextSibling;
    fragment.append(current);
    if (current === block.end) break;
  }
  return fragment;
}
function mountBlockAfter(cursor, block) {
  if (!block.fragment && block.start.previousSibling === cursor) return;
  const fragment = block.fragment ?? extractBlockRange(block);
  block.fragment = null;
  cursor.after(fragment);
}
function removeBlock(block) {
  if (!block) return;
  if (block.fragment) {
    let node = block.start;
    while (node) {
      const current = node;
      node = node.nextSibling;
      removeNodeTree(current);
      if (current === block.end) break;
    }
    block.fragment = null;
    return;
  }
  removeNodeRange(block.start, block.end);
}
function parseForExpression(expr, options) {
  const match = expr.match(/(\w+)\s+of\s+(.+?)(?:\s*;\s*track\s+(.+))?$/);
  if (match) {
    return {
      itemName: match[1],
      listExpr: match[2],
      trackExpr: match[3]?.trim() || null
    };
  }
  emitDiagnostic(options, {
    level: "error",
    domain: "template",
    code: "BN_FOR_INVALID_SYNTAX",
    message: `Invalid @for expression "${expr}"`,
    expression: expr
  });
  return null;
}
function createLoopEvalContext(ctx, itemName, item, index, length) {
  return createChildContext(ctx, {
    [itemName]: item,
    $index: index,
    $first: index === 0,
    $last: index === length - 1,
    $even: index % 2 === 0,
    $odd: index % 2 !== 0
  });
}
function renderEmptyBlock(state, anchor, emptyNode, ctx, options) {
  if (state.emptyBlock || !emptyNode) return;
  state.emptyBlock = createBlock(emptyNode, ctx, options, "@empty");
  mountBlockAfter(anchor, state.emptyBlock);
}
function clearEmptyBlock(state) {
  if (!state.emptyBlock) return;
  removeBlock(state.emptyBlock);
  state.emptyBlock = null;
}
function clearForState(state) {
  clearEmptyBlock(state);
  removeRenderedNodes(state.rendered);
  state.rendered = [];
  for (const block of state.blocks) removeBlock(block);
  state.blocks = [];
  state.blocksByKey.clear();
}
function renderUntrackedList(state, anchor, template, emptyNode, ctx, options, itemName, list) {
  for (const block of state.blocks) removeBlock(block);
  state.blocks = [];
  state.blocksByKey.clear();
  removeRenderedNodes(state.rendered);
  state.rendered = [];
  clearEmptyBlock(state);
  if (list.length === 0) {
    renderEmptyBlock(state, anchor, emptyNode, ctx, options);
    return;
  }
  let cursor = anchor;
  for (let index = 0; index < list.length; index++) {
    const itemCtx = createLoopEvalContext(ctx, itemName, list[index], index, list.length);
    const nodes = cloneAndHydrate(template, itemCtx, options);
    insertAfterAnchor(cursor, nodes);
    cursor = nodes[nodes.length - 1] ?? cursor;
    state.rendered.push(...nodes);
  }
}
function reconcileTrackedList(state, anchor, template, emptyNode, ctx, options, itemName, list, trackExpr) {
  removeRenderedNodes(state.rendered);
  state.rendered = [];
  clearEmptyBlock(state);
  if (list.length === 0) {
    for (const block of state.blocks) removeBlock(block);
    state.blocks = [];
    state.blocksByKey.clear();
    renderEmptyBlock(state, anchor, emptyNode, ctx, options);
    return;
  }
  const previousBlocks = new Map(state.blocksByKey);
  const nextBlocks = [];
  const seenKeys = /* @__PURE__ */ new Set();
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    const evalCtx = createLoopEvalContext(ctx, itemName, item, index, list.length);
    const key = evaluate(trackExpr, evalCtx, options);
    if (seenKeys.has(key)) {
      emitDiagnostic(options, {
        level: "error",
        domain: "template",
        code: "BN_FOR_DUPLICATE_TRACK_KEY",
        message: `Duplicate @for track key "${String(key)}" detected; falling back to unkeyed rendering for this update`,
        expression: trackExpr,
        key
      });
      clearForState(state);
      renderUntrackedList(state, anchor, template, emptyNode, ctx, options, itemName, list);
      return;
    }
    seenKeys.add(key);
    let block = previousBlocks.get(key);
    if (block) {
      previousBlocks.delete(key);
      updateLoopContext(block.slots, itemName, item, index, list.length);
    } else {
      const loopState = createLoopContext(ctx, itemName, item, index, list.length);
      block = createBlock(template, loopState.ctx, options);
      block.slots = loopState.slots;
      block.key = key;
    }
    nextBlocks.push(block);
  }
  for (const block of previousBlocks.values()) removeBlock(block);
  let cursor = anchor;
  for (const block of nextBlocks) {
    mountBlockAfter(cursor, block);
    cursor = block.end;
  }
  state.blocks = nextBlocks;
  state.blocksByKey = new Map(nextBlocks.map((block) => [block.key, block]));
}
function mountIfTemplate(templateNode, ctx, options) {
  const expr = templateNode.getAttribute("@if");
  let elseNode = null;
  const next = templateNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@else")) {
    elseNode = next;
    elseNode.remove();
  }
  const anchor = document.createComment("@if");
  templateNode.replaceWith(anchor);
  let rendered = [];
  const runner = effect(() => {
    removeRenderedNodes(rendered);
    const source = evaluate(expr, ctx, options) ? templateNode : elseNode;
    rendered = source ? cloneAndHydrate(source, ctx, options) : [];
    insertAfterAnchor(anchor, rendered);
  });
  registerCleanup(anchor, () => {
    runner.dispose?.();
    removeRenderedNodes(rendered);
    rendered = [];
  });
}
function mountForTemplate(templateNode, ctx, options) {
  const parsed = parseForExpression(templateNode.getAttribute("@for"), options);
  let emptyNode = null;
  const next = templateNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@empty")) {
    emptyNode = next;
    emptyNode.remove();
  }
  const anchor = document.createComment("@for");
  templateNode.replaceWith(anchor);
  if (!parsed) return;
  const state = {
    blocks: [],
    blocksByKey: /* @__PURE__ */ new Map(),
    emptyBlock: null,
    rendered: []
  };
  const runner = effect(() => {
    const list = evaluate(parsed.listExpr, ctx, options) ?? [];
    if (!Array.isArray(list)) {
      emitDiagnostic(options, {
        level: "warn",
        domain: "template",
        code: "BN_FOR_NON_ARRAY",
        message: `@for expected an array but received ${typeof list}; rendering nothing`,
        expression: parsed.listExpr
      });
      clearForState(state);
      renderEmptyBlock(state, anchor, emptyNode, ctx, options);
      return;
    }
    if (parsed.trackExpr) {
      reconcileTrackedList(
        state,
        anchor,
        templateNode,
        emptyNode,
        ctx,
        options,
        parsed.itemName,
        list,
        parsed.trackExpr
      );
      return;
    }
    renderUntrackedList(state, anchor, templateNode, emptyNode, ctx, options, parsed.itemName, list);
  });
  registerCleanup(anchor, () => {
    runner.dispose?.();
    clearForState(state);
  });
}
function mountSwitchTemplate(templateNode, ctx, options) {
  const expr = templateNode.getAttribute("@switch");
  const cases = [];
  let defaultTemplate = null;
  for (const child of templateNode.content.children) {
    if (child.tagName !== "TEMPLATE") continue;
    if (child.hasAttribute("@case")) {
      cases.push({
        value: child.getAttribute("@case"),
        template: child
      });
    } else if (child.hasAttribute("@default")) {
      defaultTemplate = child;
    }
  }
  const anchor = document.createComment("@switch");
  templateNode.replaceWith(anchor);
  let rendered = [];
  const runner = effect(() => {
    removeRenderedNodes(rendered);
    const value = evaluate(expr, ctx, options);
    const match = cases.find((entry) => evaluate(entry.value, ctx, options) === value);
    const source = match?.template ?? defaultTemplate;
    rendered = source ? cloneAndHydrate(source, ctx, options) : [];
    insertAfterAnchor(anchor, rendered);
  });
  registerCleanup(anchor, () => {
    runner.dispose?.();
    removeRenderedNodes(rendered);
    rendered = [];
  });
}
function findBlockDirective(node) {
  for (const name of listDirectives()) {
    const directive = getDirective(name);
    if (directive?.on === "template" && node.hasAttribute(`@${name}`)) {
      return { name, directive };
    }
  }
  return null;
}
function mountDirectiveBlockTemplate(templateNode, name, directive, ctx, options) {
  const value = templateNode.getAttribute(`@${name}`);
  let elseNode = null;
  const next = templateNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@else")) {
    elseNode = next;
    elseNode.remove();
  }
  const anchor = document.createComment(`@${name}`);
  templateNode.replaceWith(anchor);
  let rendered = [];
  const runner = effect(() => {
    removeRenderedNodes(rendered);
    const condition = directive.client ? Boolean(directive.client(value, ctx, options)) : false;
    const source = condition ? templateNode : elseNode;
    rendered = source ? cloneAndHydrate(source, ctx, options) : [];
    insertAfterAnchor(anchor, rendered);
  });
  registerCleanup(anchor, () => {
    runner.dispose?.();
    removeRenderedNodes(rendered);
    rendered = [];
  });
}
function hasHydrationMarkers(root) {
  const SHOW_COMMENT = globalThis.NodeFilter?.SHOW_COMMENT ?? 128;
  const walker = document.createTreeWalker(root, SHOW_COMMENT);
  while (walker.nextNode()) {
    if (String(walker.currentNode.nodeValue).startsWith("bn:")) return true;
  }
  return false;
}
function hydrateChildren(parent, ctx, options = {}) {
  const children = [...parent.childNodes];
  let processed = 0;
  for (const node of children) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "TEMPLATE") {
      if (node.hasAttribute("@if")) {
        mountIfTemplate(node, ctx, options);
        processed++;
      } else if (node.hasAttribute("@for")) {
        mountForTemplate(node, ctx, options);
        processed++;
      } else if (node.hasAttribute("@switch")) {
        mountSwitchTemplate(node, ctx, options);
        processed++;
      } else {
        const block = findBlockDirective(node);
        if (block) {
          mountDirectiveBlockTemplate(node, block.name, block.directive, ctx, options);
          processed++;
        }
      }
      continue;
    }
    processed += bindNode(node, ctx, options);
  }
  return processed;
}
function hydrateDeferred(root, ctx, options) {
  const existing = root.querySelectorAll?.("[data-bn-defer]") ?? [];
  for (const el of existing) {
    if (el.children.length > 0) {
      hydrateChildren(el, ctx, options);
    }
  }
  if (typeof document === "undefined") return () => {
  };
  function onDefer(event) {
    const id = event.detail?.id;
    if (!id) return;
    const target = root.querySelector?.(`[data-bn-defer-resolve="${id}"] ~ [data-bn-defer="${id}"]`) ?? root.querySelector?.(`div[data-bn-defer="${id}"]`);
    if (!target) return;
    hydrateChildren(target, ctx, options);
  }
  document.addEventListener("bn:defer", onDefer);
  return () => document.removeEventListener("bn:defer", onDefer);
}
function hydrate(root, ctx, options = {}) {
  const runtimeOptions = createRuntimeOptions(options);
  const processed = hydrateChildren(root, ctx, runtimeOptions);
  const cleanupDeferred = hydrateDeferred(root, ctx, runtimeOptions);
  if (processed === 0) {
    const markerMessage = hasHydrationMarkers(root) ? "hydrate() found server render markers but no template source; this build can diagnose SSR boundaries, but it still recovers by client-side template hydration only" : "hydrate() found no BaseNative template directives in the target root";
    reportHydrationMismatch(runtimeOptions, markerMessage, {
      code: hasHydrationMarkers(root) ? "BN_HYDRATE_MARKERS_WITHOUT_TEMPLATE" : "BN_HYDRATE_NO_DIRECTIVES"
    });
  }
  return () => {
    cleanupDeferred();
    disposeNodeTree(root);
  };
}

// ../../packages/runtime/src/features.js
function cssSupports(target, rule) {
  return Boolean(target?.CSS?.supports?.(rule));
}
function detectBrowserFeatures(target = globalThis) {
  const elementProto = target?.HTMLElement?.prototype;
  const dialogProto = target?.HTMLDialogElement?.prototype;
  return {
    dialog: Boolean(dialogProto?.showModal),
    popover: Boolean(elementProto?.showPopover),
    anchorPositioning: cssSupports(target, "anchor-name: --bn-anchor") && cssSupports(target, "position-anchor: --bn-anchor"),
    baseSelect: cssSupports(target, "appearance: base-select") || cssSupports(target, "-webkit-appearance: base-select")
  };
}
function supportsFeature(name, target = globalThis) {
  return Boolean(detectBrowserFeatures(target)[name]);
}
var browserFeatures = /* @__PURE__ */ detectBrowserFeatures();

// ../../packages/runtime/src/devtools.js
var devtoolsState = {
  signals: /* @__PURE__ */ new Map(),
  effects: /* @__PURE__ */ new Map(),
  hydrations: [],
  enabled: false
};
var nextSignalId = 1;
var nextEffectId = 1;
function enableDevtools() {
  devtoolsState.enabled = true;
  if (typeof globalThis !== "undefined") {
    globalThis.__BASENATIVE_DEVTOOLS__ = {
      getSignals: () => [...devtoolsState.signals.entries()].map(([id, info]) => ({
        id,
        label: info.label,
        value: info.accessor(),
        subscriberCount: info.subscriberCount?.() ?? 0
      })),
      getEffects: () => [...devtoolsState.effects.entries()].map(([id, info]) => ({
        id,
        label: info.label,
        disposed: info.disposed?.() ?? false
      })),
      getHydrations: () => [...devtoolsState.hydrations],
      getState: () => ({ ...devtoolsState, signalCount: devtoolsState.signals.size, effectCount: devtoolsState.effects.size })
    };
  }
}
function trackSignal(accessor, label) {
  if (!devtoolsState.enabled) return;
  const id = nextSignalId++;
  devtoolsState.signals.set(id, {
    label: label || `signal_${id}`,
    accessor
  });
  return id;
}
function trackEffect(handle, label) {
  if (!devtoolsState.enabled) return;
  const id = nextEffectId++;
  devtoolsState.effects.set(id, {
    label: label || `effect_${id}`,
    disposed: () => false
  });
  return id;
}
function recordHydration(root, details = {}) {
  if (!devtoolsState.enabled) return;
  devtoolsState.hydrations.push({
    timestamp: Date.now(),
    root: root?.tagName || "unknown",
    directivesProcessed: details.directivesProcessed || 0,
    duration: details.duration || 0
  });
}
function disableDevtools() {
  devtoolsState.enabled = false;
  devtoolsState.signals.clear();
  devtoolsState.effects.clear();
  devtoolsState.hydrations = [];
  if (typeof globalThis !== "undefined") {
    delete globalThis.__BASENATIVE_DEVTOOLS__;
  }
}
function isDevtoolsEnabled() {
  return devtoolsState.enabled;
}

// ../../packages/runtime/src/error-boundary.js
function createErrorBoundary(options = {}) {
  let lastError = null;
  let hasError = false;
  return {
    /**
     * Wraps a function call in error handling.
     * Returns the result on success, or null on error.
     */
    try(fn) {
      try {
        const result = fn();
        return result;
      } catch (error) {
        lastError = error;
        hasError = true;
        if (options.onError) {
          options.onError(error);
        }
        emitDiagnostic(options, {
          level: "error",
          domain: "boundary",
          code: "BN_ERROR_BOUNDARY_CAUGHT",
          message: error.message || "An error occurred during rendering",
          error
        });
        return null;
      }
    },
    /**
     * Returns the last caught error, if any.
     */
    getError() {
      return lastError;
    },
    /**
     * Returns whether an error has been caught.
     */
    hasError() {
      return hasError;
    },
    /**
     * Returns the fallback HTML string.
     */
    getFallback() {
      return options.fallback || "";
    },
    /**
     * Resets the error state.
     */
    reset() {
      lastError = null;
      hasError = false;
    }
  };
}
function renderWithBoundary(renderFn, options = {}) {
  try {
    return renderFn();
  } catch (error) {
    if (options.onError) {
      options.onError(error);
    }
    return options.fallback || `<!-- BaseNative render error: ${escapeComment(error.message)} -->`;
  }
}
function escapeComment(str) {
  return String(str).replace(/--/g, "- -");
}

// ../../packages/runtime/src/plugins.js
var VALID_HOOKS = [
  "beforeRender",
  "afterRender",
  "beforeHydrate",
  "afterHydrate",
  "error"
];
function definePlugin(config) {
  if (!config || typeof config.name !== "string" || config.name === "") {
    throw new Error('Plugin must have a non-empty "name" string.');
  }
  return {
    name: config.name,
    setup: typeof config.setup === "function" ? config.setup : () => {
    }
  };
}
function createPluginRegistry() {
  const plugins2 = /* @__PURE__ */ new Map();
  const hooks = /* @__PURE__ */ new Map();
  const directives = /* @__PURE__ */ new Map();
  function addDirective(name, handler) {
    if (typeof name !== "string" || name === "") {
      throw new Error("Directive name must be a non-empty string.");
    }
    if (typeof handler !== "function") {
      throw new Error(`Directive handler for "${name}" must be a function.`);
    }
    directives.set(name, handler);
  }
  function addHook(hookName, fn) {
    if (!VALID_HOOKS.includes(hookName)) {
      throw new Error(
        `Unknown hook "${hookName}". Valid hooks: ${VALID_HOOKS.join(", ")}`
      );
    }
    if (typeof fn !== "function") {
      throw new Error(`Hook "${hookName}" handler must be a function.`);
    }
    if (!hooks.has(hookName)) {
      hooks.set(hookName, []);
    }
    hooks.get(hookName).push(fn);
  }
  function register(plugin) {
    if (!plugin || typeof plugin.name !== "string") {
      throw new Error('Invalid plugin: must have a "name" property.');
    }
    if (plugins2.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }
    plugins2.set(plugin.name, plugin);
    const api = {
      addDirective,
      onBeforeRender: (fn) => addHook("beforeRender", fn),
      onAfterRender: (fn) => addHook("afterRender", fn),
      onBeforeHydrate: (fn) => addHook("beforeHydrate", fn),
      onAfterHydrate: (fn) => addHook("afterHydrate", fn),
      onError: (fn) => addHook("error", fn)
    };
    plugin.setup(api);
  }
  function runHook(hookName, ...args) {
    const fns = hooks.get(hookName);
    if (!fns) return;
    for (const fn of fns) {
      fn(...args);
    }
  }
  function getDirective2(name) {
    return directives.get(name);
  }
  function getPlugins() {
    return [...plugins2.keys()];
  }
  return { register, runHook, getDirective: getDirective2, getPlugins };
}

// ../../packages/runtime/src/lazy.js
function createLazyHydrator(options = {}) {
  const { rootMargin = "0px", threshold = 0 } = options;
  const pending = /* @__PURE__ */ new Map();
  const hydrated = /* @__PURE__ */ new WeakSet();
  let observer = null;
  function runHydrate(element) {
    if (hydrated.has(element)) return;
    const hydrateFn = pending.get(element);
    if (!hydrateFn) return;
    pending.delete(element);
    hydrated.add(element);
    observer?.unobserve(element);
    hydrateFn();
  }
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            runHydrate(entry.target);
          }
        }
      },
      { rootMargin, threshold }
    );
  }
  return {
    /**
     * Watch an element and call hydrateFn when it becomes visible.
     * Falls back to immediate hydration when IntersectionObserver is unavailable.
     */
    observe(element, hydrateFn) {
      if (hydrated.has(element)) return;
      pending.set(element, hydrateFn);
      if (observer) {
        observer.observe(element);
      } else {
        runHydrate(element);
      }
    },
    /** Stop observing all elements and clear pending queue. */
    disconnect() {
      observer?.disconnect();
      pending.clear();
    },
    /** Force immediate hydration of a tracked element. */
    hydrateNow(element) {
      runHydrate(element);
    },
    /** Get count of elements still waiting for hydration. */
    getPending() {
      return pending.size;
    }
  };
}
function lazyHydrate(element, hydrateFn, options = {}) {
  const hydrator = createLazyHydrator(options);
  hydrator.observe(element, hydrateFn);
  return hydrator;
}
function hydrateOnIdle(hydrateFn) {
  let id;
  if (typeof requestIdleCallback !== "undefined") {
    id = requestIdleCallback(() => hydrateFn());
    return () => cancelIdleCallback(id);
  }
  id = setTimeout(() => hydrateFn(), 0);
  return () => clearTimeout(id);
}
function hydrateOnInteraction(element, hydrateFn, events) {
  const eventList = events ?? ["click", "focus", "mouseenter"];
  let hydrated = false;
  function handler() {
    if (hydrated) return;
    hydrated = true;
    cleanup();
    hydrateFn();
  }
  function cleanup() {
    for (const evt of eventList) {
      element.removeEventListener(evt, handler);
    }
  }
  for (const evt of eventList) {
    element.addEventListener(evt, handler, { once: true });
  }
  return cleanup;
}
function hydrateOnMedia(hydrateFn, query) {
  const mql = matchMedia(query);
  let hydrated = false;
  function check() {
    if (hydrated) return;
    if (mql.matches) {
      hydrated = true;
      cleanup();
      hydrateFn();
    }
  }
  function cleanup() {
    mql.removeEventListener("change", check);
  }
  if (mql.matches) {
    hydrated = true;
    hydrateFn();
    return cleanup;
  }
  mql.addEventListener("change", check);
  return cleanup;
}

// ../../packages/runtime/src/vitals.js
function createObserver(type, callback) {
  if (typeof PerformanceObserver === "undefined") return null;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry);
      }
    });
    observer.observe({ type, buffered: true });
    return observer;
  } catch {
    return null;
  }
}
function observeLCP(callback) {
  const observer = createObserver("largest-contentful-paint", (entry) => {
    callback({ name: "LCP", value: entry.startTime, entries: [entry] });
  });
  return observer ? () => observer.disconnect() : null;
}
function observeFID(callback) {
  const observer = createObserver("first-input", (entry) => {
    callback({
      name: "FID",
      value: entry.processingStart - entry.startTime,
      entries: [entry]
    });
  });
  return observer ? () => observer.disconnect() : null;
}
function observeCLS(callback) {
  let clsValue = 0;
  const allEntries = [];
  const observer = createObserver("layout-shift", (entry) => {
    if (entry.hadRecentInput) return;
    clsValue += entry.value;
    allEntries.push(entry);
    callback({ name: "CLS", value: clsValue, entries: allEntries });
  });
  return observer ? () => observer.disconnect() : null;
}
function observeFCP(callback) {
  const observer = createObserver("paint", (entry) => {
    if (entry.name === "first-contentful-paint") {
      callback({ name: "FCP", value: entry.startTime, entries: [entry] });
    }
  });
  return observer ? () => observer.disconnect() : null;
}
function observeTTFB(callback) {
  const observer = createObserver("navigation", (entry) => {
    callback({
      name: "TTFB",
      value: entry.responseStart,
      entries: [entry]
    });
  });
  return observer ? () => observer.disconnect() : null;
}
function observeINP(callback) {
  let maxDuration = 0;
  const observer = createObserver("event", (entry) => {
    const duration = entry.duration;
    if (duration > maxDuration) {
      maxDuration = duration;
      callback({ name: "INP", value: duration, entries: [entry] });
    }
  });
  return observer ? () => observer.disconnect() : null;
}
function createVitalsReporter(options = {}) {
  const { onReport } = options;
  const metrics = {};
  const cleanups = [];
  function handleMetric(metric) {
    metrics[metric.name] = metric.value;
    onReport?.(metric);
  }
  return {
    /** Begin observing all Web Vitals. */
    start() {
      const observers = [
        observeLCP(handleMetric),
        observeFID(handleMetric),
        observeCLS(handleMetric),
        observeFCP(handleMetric),
        observeTTFB(handleMetric),
        observeINP(handleMetric)
      ];
      for (const cleanup of observers) {
        if (cleanup) cleanups.push(cleanup);
      }
    },
    /** Stop all observers. */
    stop() {
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    },
    /** Return a snapshot of collected metrics. */
    getMetrics() {
      return { ...metrics };
    }
  };
}

// ../../packages/runtime/src/debug.js
var _debugEnabled = false;
var _label = "";
var _logger = typeof console !== "undefined" ? console : null;
var stats = {
  signalsCreated: 0,
  effectsCreated: 0,
  signalWrites: 0,
  signalReads: 0,
  effectRuns: 0
};
function log(level, ...args) {
  if (!_debugEnabled || !_logger) return;
  const prefix = _label ? `[BN:debug:${_label}]` : "[BN:debug]";
  _logger[level]?.(prefix, ...args);
}
function enableDebug(opts = {}) {
  _debugEnabled = true;
  _label = opts.label ?? "";
  _logger = opts.logger ?? (typeof console !== "undefined" ? console : null);
  _debugEnabled = true;
  if (opts.trackReads !== void 0) {
    _config.trackReads = Boolean(opts.trackReads);
  }
  log("info", "debug mode enabled", opts.label ? `(${opts.label})` : "");
}
function disableDebug() {
  log("info", "debug mode disabled. stats:", getDebugStats());
  _debugEnabled = false;
  _label = "";
  Object.assign(stats, {
    signalsCreated: 0,
    effectsCreated: 0,
    signalWrites: 0,
    signalReads: 0,
    effectRuns: 0
  });
}
function isDebugEnabled() {
  return _debugEnabled;
}
function getDebugStats() {
  return { ...stats };
}
var _config = {
  trackReads: false
};
function debugSignal(s, name = "signal") {
  stats.signalsCreated++;
  log("debug", `signal:${name} created`, `(${s()})`);
  const wrapped = () => {
    if (_config.trackReads) {
      stats.signalReads++;
      log("debug", `signal:${name} read \u2192`, s());
    }
    return s();
  };
  wrapped.set = (next) => {
    const before = s();
    s.set(next);
    const after = s();
    if (_debugEnabled) {
      stats.signalWrites++;
      log("debug", `signal:${name} set`, before, "\u2192", after);
    }
  };
  wrapped.peek = () => s.peek();
  return wrapped;
}
function debugEffect(fn, name = "effect") {
  stats.effectsCreated++;
  let runCount = 0;
  const handle = effect(() => {
    runCount++;
    stats.effectRuns++;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    log("debug", `effect:${name} run #${runCount} started`);
    const result = fn();
    const duration = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
    log("debug", `effect:${name} run #${runCount} done (${duration.toFixed(2)}ms)`);
    return result;
  });
  return handle;
}
function debugTime(label, fn) {
  if (!_debugEnabled) return fn();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  let result;
  try {
    result = fn();
  } finally {
    const ms = ((typeof performance !== "undefined" ? performance.now() : Date.now()) - start).toFixed(2);
    log("info", `\u23F1 ${label}: ${ms}ms`);
  }
  return result;
}
function debugAssert(condition, message) {
  if (!_debugEnabled) return;
  if (!condition) {
    log("error", `assertion failed: ${message}`);
    throw new Error(`[BN:debug] Assertion failed: ${message}`);
  }
}
function debugDeps(s, name = "signal") {
  if (!_debugEnabled) return;
  const value = typeof s === "function" ? s() : s;
  log("info", `deps:${name} current value:`, value);
}

// ../../packages/components/src/multiselect.js
function tagHtml(value, text) {
  return `<span data-bn="tag" data-value="${escapeAttr(value)}">${escapeText(text)}<button type="button" data-bn="tag-remove" aria-label="Remove ${escapeAttr(text)}">&times;</button></span>`;
}
var TAGS = '[data-bn="multiselect-tags"]';
var TAG = '[data-bn="tag"]';
var REMOVE = '[data-bn="tag-remove"]';
var SEARCH = '[data-bn="multiselect-search"]';
function closestFrom(target, selector) {
  return target && typeof target.closest === "function" ? target.closest(selector) : null;
}
function initMultiselect(root, options = {}) {
  const { onChange } = options;
  const select = root.querySelector("select[multiple]");
  const tags = root.querySelector(TAGS);
  const input = root.querySelector(SEARCH);
  const selectOptions = () => Array.from(select ? select.querySelectorAll("option") : []);
  const values = () => selectOptions().filter((option) => option.selected).map((option) => option.value);
  const tagFor = (value) => Array.from(tags ? tags.querySelectorAll(TAG) : []).find((tag) => tag.getAttribute("data-value") === value) ?? null;
  function emit() {
    if (onChange) onChange(values());
  }
  function remove(value) {
    const option = selectOptions().find((o) => o.value === value);
    if (!option || !option.selected) return false;
    option.selected = false;
    const tag = tagFor(value);
    if (tag && typeof tag.remove === "function") tag.remove();
    return true;
  }
  function add(value) {
    const option = selectOptions().find((o) => o.value === value);
    if (!option || option.selected) return false;
    option.selected = true;
    if (tags && !tagFor(value)) tags.insertAdjacentHTML("beforeend", tagHtml(value, String(option.textContent ?? value)));
    return true;
  }
  function commitInput() {
    if (!input) return false;
    const text = String(input.value ?? "").trim().toLowerCase();
    if (!text) return false;
    const option = selectOptions().find((o) => String(o.textContent ?? "").trim().toLowerCase() === text || String(o.value).toLowerCase() === text);
    if (!option) return false;
    input.value = "";
    if (add(option.value)) emit();
    return true;
  }
  function onClick(e) {
    const button = closestFrom(e.target, REMOVE);
    const tag = button ? closestFrom(button, TAG) : null;
    if (!tag) return;
    if (!remove(tag.getAttribute("data-value"))) return;
    if (input && typeof input.focus === "function") input.focus();
    emit();
  }
  function onKeydown(e) {
    if (!input || e.target !== input) return;
    if (e.key === "Backspace" && !input.value) {
      const last = values().at(-1);
      if (last !== void 0 && remove(last)) {
        e.preventDefault();
        emit();
      }
    } else if (e.key === "Enter" && commitInput()) {
      e.preventDefault();
    }
  }
  function onInputChange(e) {
    if (input && e.target === input) commitInput();
  }
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("change", onInputChange);
  return {
    add,
    remove,
    values,
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("change", onInputChange);
    }
  };
}

// ../../packages/components/src/datagrid.js
var TH = '[data-bn="datagrid-th"]';
var TH_BUTTON = '[data-bn="datagrid-th-button"]';
var TD = '[data-bn="datagrid-td"]';
var ROW = '[data-bn="datagrid-row"]';
var SELECT_ALL = '[data-bn="datagrid-select-all"]';
var ROW_SELECT = '[data-bn="datagrid-row-select"]';
var CELL = '[data-bn="datagrid-th-select"], [data-bn="datagrid-th"], [data-bn="datagrid-td-select"], [data-bn="datagrid-td"]';
function closestFrom2(target, selector) {
  return target && typeof target.closest === "function" ? target.closest(selector) : null;
}
function isCell(el) {
  return Boolean(el) && typeof el.matches === "function" && el.matches(CELL);
}
function stripArrow(text) {
  return String(text ?? "").replace(/\s*[↑↓]\s*$/, "");
}
function initDataGrid(wrapper, options = {}) {
  const { onSort, onSelectionChange } = options;
  const all = (selector) => Array.from(wrapper.querySelectorAll(selector));
  const rowBoxes = () => all(ROW_SELECT);
  function sortState() {
    const th = wrapper.querySelector(`${TH}[data-sorted]`);
    return th ? { key: th.getAttribute("data-key"), dir: th.getAttribute("data-sorted") } : null;
  }
  function applySort(th, dir) {
    for (const other of all(TH)) {
      const button = other.querySelector(TH_BUTTON);
      if (other === th) {
        other.setAttribute("data-sorted", dir);
        other.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
        if (button) button.textContent = `${stripArrow(button.textContent)} ${dir === "asc" ? "\u2191" : "\u2193"}`;
      } else {
        other.removeAttribute("data-sorted");
        other.removeAttribute("aria-sort");
        if (button) button.textContent = stripArrow(button.textContent);
      }
    }
  }
  function sortRows(key, dir) {
    const rows2 = all(ROW);
    const tbody = rows2[0]?.parentElement;
    if (!tbody) return;
    const text = (row) => {
      const cell = Array.from(row.querySelectorAll(TD)).find((td) => td.getAttribute("data-key") === key);
      return String(cell?.textContent ?? "").trim();
    };
    const collator = new Intl.Collator(void 0, { numeric: true, sensitivity: "base" });
    const sign = dir === "asc" ? 1 : -1;
    const sorted = rows2.map((row, i) => ({ row, i, text: text(row) })).sort((a, b) => collator.compare(a.text, b.text) * sign || a.i - b.i);
    for (const { row } of sorted) tbody.appendChild(row);
  }
  function sort(key, dir = "asc", notify = false) {
    const th = all(TH).find((t) => t.getAttribute("data-key") === key);
    if (!th) return false;
    applySort(th, dir);
    if (notify && onSort) onSort({ key, dir });
    else if (!onSort) sortRows(key, dir);
    return true;
  }
  function selected() {
    return rowBoxes().filter((box) => box.checked).map((box) => box.getAttribute("data-row-id"));
  }
  function reflectSelection() {
    const boxes = rowBoxes();
    const count = boxes.filter((box) => box.checked).length;
    const master = wrapper.querySelector(SELECT_ALL);
    if (master) {
      master.checked = count > 0 && count === boxes.length;
      master.indeterminate = count > 0 && count < boxes.length;
    }
    for (const box of boxes) {
      const row = closestFrom2(box, ROW);
      if (row) row.setAttribute("aria-selected", box.checked ? "true" : "false");
    }
  }
  function onClick(e) {
    const button = closestFrom2(e.target, TH_BUTTON);
    const th = button ? closestFrom2(button, TH) : null;
    if (!th) return;
    sort(th.getAttribute("data-key"), th.getAttribute("data-sorted") === "asc" ? "desc" : "asc", true);
  }
  function onChange(e) {
    const master = closestFrom2(e.target, SELECT_ALL);
    if (master) {
      for (const box of rowBoxes()) box.checked = Boolean(master.checked);
    } else if (!closestFrom2(e.target, ROW_SELECT)) {
      return;
    }
    reflectSelection();
    if (onSelectionChange) onSelectionChange(selected());
  }
  const rows = () => all("tr").filter((row) => Array.from(row.children ?? []).some(isCell));
  const cellsOf = (row) => Array.from(row.children ?? []).filter(isCell);
  const cellAt = (row, index) => row ? cellsOf(row)[Math.min(index, cellsOf(row).length - 1)] : void 0;
  function focusCell(cell) {
    for (const row of rows()) for (const c of cellsOf(row)) c.setAttribute("tabindex", c === cell ? "0" : "-1");
    if (typeof cell.focus === "function") cell.focus();
  }
  function onKeydown(e) {
    const cell = closestFrom2(e.target, CELL);
    if (!cell) return;
    const ownControl = closestFrom2(e.target, TH_BUTTON) || closestFrom2(e.target, SELECT_ALL) || closestFrom2(e.target, ROW_SELECT);
    if (e.target !== cell && !ownControl) return;
    const editing = cell.hasAttribute("contenteditable") && (e.key === "ArrowLeft" || e.key === "ArrowRight");
    if (editing) return;
    const row = cell.parentElement;
    const list = rows();
    const rowCells = cellsOf(row);
    const r = list.indexOf(row);
    const c = rowCells.indexOf(cell);
    if (r < 0 || c < 0) return;
    let next;
    switch (e.key) {
      case "ArrowRight":
        next = rowCells[c + 1];
        break;
      case "ArrowLeft":
        next = rowCells[c - 1];
        break;
      case "ArrowDown":
        next = cellAt(list[r + 1], c);
        break;
      case "ArrowUp":
        next = cellAt(list[r - 1], c);
        break;
      case "Home":
        next = e.ctrlKey ? cellAt(list[0], 0) : rowCells[0];
        break;
      case "End": {
        const lastRow = list[list.length - 1];
        next = e.ctrlKey ? cellsOf(lastRow)[cellsOf(lastRow).length - 1] : rowCells[rowCells.length - 1];
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    if (next) focusCell(next);
  }
  const first = cellAt(rows()[0], 0);
  if (first) for (const row of rows()) for (const c of cellsOf(row)) c.setAttribute("tabindex", c === first ? "0" : "-1");
  reflectSelection();
  wrapper.addEventListener("click", onClick);
  wrapper.addEventListener("change", onChange);
  wrapper.addEventListener("keydown", onKeydown);
  return {
    sort: (key, dir = "asc") => sort(key, dir),
    sortState,
    select(ids) {
      const wanted = new Set(ids.map(String));
      for (const box of rowBoxes()) box.checked = wanted.has(box.getAttribute("data-row-id"));
      reflectSelection();
    },
    selected,
    destroy() {
      wrapper.removeEventListener("click", onClick);
      wrapper.removeEventListener("change", onChange);
      wrapper.removeEventListener("keydown", onKeydown);
    }
  };
}

// ../../packages/components/src/tree.js
var ITEM = '[data-bn="tree-item"]';
var CONTENT = '[data-bn="tree-item-content"]';
var TOGGLE = '[data-bn="tree-toggle"]';
var CHILDREN = '[data-bn="tree-children"]';
var HIDDEN_GROUP = '[data-bn="tree-children"][hidden]';
function closestFrom3(target, selector) {
  return target && typeof target.closest === "function" ? target.closest(selector) : null;
}
function initTree(tree, options = {}) {
  const { onToggle, onSelect } = options;
  const items = () => Array.from(tree.querySelectorAll(ITEM));
  const visible = () => items().filter((item) => !closestFrom3(item, HIDDEN_GROUP));
  const idOf = (item) => item.getAttribute("data-node-id");
  const byId = (id) => items().find((item) => idOf(item) === id) ?? null;
  const isExpandable = (item) => item.hasAttribute("aria-expanded");
  const isExpanded = (item) => item.getAttribute("aria-expanded") === "true";
  const parentOf = (item) => closestFrom3(item.parentElement, ITEM);
  function setExpanded(item, expanded) {
    if (!isExpandable(item) || isExpanded(item) === expanded) return false;
    item.setAttribute("aria-expanded", String(expanded));
    const group = item.querySelector(CHILDREN);
    if (group) {
      if (expanded) group.removeAttribute("hidden");
      else group.setAttribute("hidden", "");
    }
    const toggle2 = item.querySelector(TOGGLE);
    if (toggle2) {
      toggle2.setAttribute("aria-label", expanded ? "Collapse" : "Expand");
      toggle2.textContent = expanded ? "\u25BE" : "\u25B8";
    }
    return true;
  }
  function toggle(item) {
    const next = !isExpanded(item);
    if (setExpanded(item, next) && onToggle) onToggle(idOf(item), next, item);
  }
  function roving(item) {
    for (const it of items()) it.setAttribute("tabindex", it === item ? "0" : "-1");
  }
  function focusItem(item) {
    if (!item) return;
    roving(item);
    if (typeof item.focus === "function") item.focus();
  }
  function applySelection(item) {
    for (const it of items()) {
      it.setAttribute("aria-selected", it === item ? "true" : "false");
      const content = it.querySelector(CONTENT);
      if (!content) continue;
      if (it === item) content.setAttribute("data-selected", "");
      else content.removeAttribute("data-selected");
    }
  }
  function select(item) {
    applySelection(item);
    if (onSelect) onSelect(idOf(item), item);
  }
  function onClick(e) {
    const item = closestFrom3(e.target, ITEM);
    if (!item) return;
    if (closestFrom3(e.target, TOGGLE)) {
      toggle(item);
      roving(item);
      return;
    }
    if (!closestFrom3(e.target, CONTENT)) return;
    select(item);
    focusItem(item);
  }
  function onKeydown(e) {
    const item = closestFrom3(e.target, ITEM);
    if (!item) return;
    const onToggleButton = Boolean(closestFrom3(e.target, TOGGLE));
    const list = visible();
    const index = list.indexOf(item);
    if (index < 0) return;
    let next;
    switch (e.key) {
      case "ArrowDown":
        next = list[index + 1];
        break;
      case "ArrowUp":
        next = list[index - 1];
        break;
      case "Home":
        next = list[0];
        break;
      case "End":
        next = list[list.length - 1];
        break;
      case "ArrowRight":
        if (isExpandable(item) && !isExpanded(item)) toggle(item);
        else if (isExpanded(item)) next = visible()[index + 1];
        break;
      case "ArrowLeft":
        if (isExpanded(item)) toggle(item);
        else next = parentOf(item);
        break;
      case "Enter":
      case " ":
        if (onToggleButton) return;
        select(item);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next) focusItem(next);
  }
  const initial = items().find((item) => item.getAttribute("aria-selected") === "true") ?? items()[0] ?? null;
  if (initial) roving(initial);
  tree.addEventListener("click", onClick);
  tree.addEventListener("keydown", onKeydown);
  return {
    expand(id) {
      const item = byId(id);
      return Boolean(item) && setExpanded(item, true);
    },
    collapse(id) {
      const item = byId(id);
      return Boolean(item) && setExpanded(item, false);
    },
    select(id) {
      const item = byId(id);
      if (!item) return false;
      applySelection(item);
      roving(item);
      return true;
    },
    selected() {
      const item = items().find((it) => it.getAttribute("aria-selected") === "true");
      return item ? idOf(item) : null;
    },
    destroy() {
      tree.removeEventListener("click", onClick);
      tree.removeEventListener("keydown", onKeydown);
    }
  };
}

// ../../packages/components/src/virtualizer.js
function defaultRenderItem(item, index) {
  return `<div data-bn="virtual-item" data-index="${index}">${escapeText(item)}</div>`;
}
var WINDOW = '[data-bn="virtual-window"]';
function initVirtualList(container, options = {}) {
  if (!Array.isArray(options.items)) {
    throw new TypeError("initVirtualList needs options.items \u2014 the array renderVirtualList() rendered from. Only the first window is in the DOM, so the initialiser cannot recover the rest.");
  }
  const { renderItem = defaultRenderItem, overscan = 5 } = options;
  let items = options.items;
  const win = container.querySelector(WINDOW);
  const spacer = win ? win.parentElement : null;
  const itemHeight = Number(options.itemHeight ?? (win ? win.getAttribute("data-item-height") : 0)) || 40;
  let range = { start: -1, end: -1 };
  function height() {
    return Number(container.clientHeight) || Number.parseFloat(container.style?.height) || 0;
  }
  function update() {
    if (!win) return range;
    const total = items.length;
    const top = Number(container.scrollTop) || 0;
    const start = Math.max(0, Math.floor(top / itemHeight) - overscan);
    const end = Math.min(total, Math.ceil((top + height()) / itemHeight) + overscan);
    if (start === range.start && end === range.end) return range;
    range = { start, end };
    win.innerHTML = items.slice(start, end).map((item, i) => renderItem(item, start + i)).join("");
    win.style.top = `${start * itemHeight}px`;
    win.setAttribute("data-total", String(total));
    if (spacer && spacer.style) spacer.style.height = `${total * itemHeight}px`;
    return range;
  }
  update();
  container.addEventListener("scroll", update, { passive: true });
  return {
    update,
    range: () => range,
    scrollTo(index) {
      container.scrollTop = Math.max(0, index) * itemHeight;
      update();
    },
    setItems(next) {
      items = Array.isArray(next) ? next : [];
      range = { start: -1, end: -1 };
      update();
    },
    destroy() {
      container.removeEventListener("scroll", update);
    }
  };
}

// ../../packages/components/src/drawer.js
var OVERLAY = '[data-bn="drawer-overlay"]';
var CLOSE = '[data-bn="drawer-close"]';
function overlayFor(drawer) {
  const prev = drawer.previousElementSibling;
  return prev && typeof prev.matches === "function" && prev.matches(OVERLAY) ? prev : null;
}
function focus(el) {
  if (el && typeof el.focus === "function") el.focus();
}
function initDrawer(drawer, options = {}) {
  const { dismissible = true, onChange } = options;
  const overlay = options.overlay ?? overlayFor(drawer);
  const doc = drawer.ownerDocument ?? (typeof document === "undefined" ? null : document);
  let returnTarget = null;
  const isOpen = () => drawer.hasAttribute("data-open");
  function open() {
    if (isOpen()) return;
    returnTarget = doc?.activeElement ?? null;
    drawer.removeAttribute("inert");
    drawer.setAttribute("data-open", "");
    if (overlay) overlay.setAttribute("data-open", "");
    const target = drawer.querySelector(CLOSE);
    if (!target && !drawer.hasAttribute("tabindex")) drawer.setAttribute("tabindex", "-1");
    focus(target ?? drawer);
    if (onChange) onChange(true);
  }
  function close() {
    if (!isOpen()) return;
    drawer.removeAttribute("data-open");
    if (overlay) overlay.removeAttribute("data-open");
    focus(returnTarget);
    returnTarget = null;
    drawer.setAttribute("inert", "");
    if (onChange) onChange(false);
  }
  function onClick(e) {
    const button = typeof e.target.closest === "function" ? e.target.closest(CLOSE) : null;
    if (!button) return;
    if (typeof button.closest === "function" && button.closest('[data-bn="drawer"]') !== drawer) return;
    close();
  }
  function onOverlayClick() {
    if (dismissible) close();
  }
  function onKeydown(e) {
    if (e.key !== "Escape" || !isOpen()) return;
    e.preventDefault();
    close();
  }
  drawer.addEventListener("click", onClick);
  if (overlay) overlay.addEventListener("click", onOverlayClick);
  if (doc) doc.addEventListener("keydown", onKeydown);
  return {
    open,
    close,
    toggle() {
      if (isOpen()) close();
      else open();
    },
    isOpen,
    destroy() {
      drawer.removeEventListener("click", onClick);
      if (overlay) overlay.removeEventListener("click", onOverlayClick);
      if (doc) doc.removeEventListener("keydown", onKeydown);
    }
  };
}

// ../../packages/components/src/tabs.js
function closestTab(target) {
  return target && typeof target.closest === "function" ? target.closest('[data-bn="tab"]') : null;
}
function initTabs(root, options = {}) {
  const { onChange, activation = "automatic" } = options;
  const own = (selector) => Array.from(root.querySelectorAll(selector)).filter(
    (el) => typeof el.closest !== "function" || el.closest('[data-bn="tabs"]') === root
  );
  const tabs = () => own('[data-bn="tab"]');
  const panels = () => own('[data-bn="tab-panel"]');
  const enabled = () => tabs().filter((tab) => !tab.hasAttribute("disabled"));
  const idOf = (tab) => tab.getAttribute("data-tab");
  function roving(target) {
    for (const tab of tabs()) tab.setAttribute("tabindex", tab === target ? "0" : "-1");
  }
  function apply(target) {
    for (const tab of tabs()) tab.setAttribute("aria-selected", tab === target ? "true" : "false");
    roving(target);
    const controls = target.getAttribute("aria-controls");
    for (const panel of panels()) {
      if (panel.getAttribute("id") === controls) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    }
  }
  let current = tabs().find((tab) => tab.getAttribute("aria-selected") === "true") ?? enabled()[0] ?? null;
  if (current) apply(current);
  function change(tab, focus2 = false) {
    const changed = tab !== current;
    if (changed) {
      current = tab;
      apply(tab);
    }
    if (focus2 && typeof tab.focus === "function") tab.focus();
    if (changed && onChange) onChange(idOf(tab), tab);
  }
  function onClick(e) {
    const tab = closestTab(e.target);
    if (!tab || tab.hasAttribute("disabled") || !tabs().includes(tab)) return;
    change(tab);
  }
  function onKeydown(e) {
    const tab = closestTab(e.target);
    if (!tab) return;
    const list = enabled();
    const index = list.indexOf(tab);
    if (index < 0) return;
    let next;
    switch (e.key) {
      case "ArrowRight":
        next = list[(index + 1) % list.length];
        break;
      case "ArrowLeft":
        next = list[(index - 1 + list.length) % list.length];
        break;
      case "Home":
        next = list[0];
        break;
      case "End":
        next = list[list.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (activation === "manual") {
      roving(next);
      if (typeof next.focus === "function") next.focus();
    } else {
      change(next, true);
    }
  }
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  return {
    select(id) {
      const tab = tabs().find((t) => idOf(t) === id);
      if (!tab) return false;
      if (tab !== current) {
        current = tab;
        apply(tab);
      }
      return true;
    },
    active: () => current ? idOf(current) : null,
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
    }
  };
}

// ../../packages/components/src/dropdown-menu.js
var TRIGGER = '[data-bn="dropdown-trigger"]';
var MENU = '[data-bn="dropdown-menu"]';
var ITEM2 = '[data-bn="dropdown-item"]';
function closestFrom4(target, selector) {
  return target && typeof target.closest === "function" ? target.closest(selector) : null;
}
function initDropdownMenu(root, options = {}) {
  const { onSelect } = options;
  const menu = root.querySelector(MENU);
  const items = () => Array.from(menu ? menu.querySelectorAll(ITEM2) : []);
  let open = false;
  let focusOnOpen = "first";
  function focusItem(item) {
    if (item && typeof item.focus === "function") item.focus();
  }
  function show() {
    if (open || !menu || typeof menu.showPopover !== "function") return;
    menu.showPopover();
  }
  function hide() {
    if (!open || !menu || typeof menu.hidePopover !== "function") return;
    menu.hidePopover();
  }
  function onToggle(e) {
    open = e.newState === "open";
    if (!open) return;
    const list = items();
    focusItem(focusOnOpen === "last" ? list[list.length - 1] : list[0]);
    focusOnOpen = "first";
  }
  function onClick(e) {
    const item = closestFrom4(e.target, ITEM2);
    if (!item) return;
    if (item.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
      return;
    }
    hide();
    if (onSelect) onSelect(item.getAttribute("data-action") ?? "", item);
  }
  function onKeydown(e) {
    const list = items();
    if (!list.length) return;
    const item = closestFrom4(e.target, ITEM2);
    const onTrigger = !item && Boolean(closestFrom4(e.target, TRIGGER));
    if (!item && !onTrigger) return;
    const index = list.indexOf(item);
    let next;
    switch (e.key) {
      case "ArrowDown":
        next = item ? list[(index + 1) % list.length] : list[0];
        break;
      case "ArrowUp":
        next = item ? list[(index - 1 + list.length) % list.length] : list[list.length - 1];
        break;
      case "Home":
        next = list[0];
        break;
      case "End":
        next = list[list.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (onTrigger && !open) {
      focusOnOpen = e.key === "ArrowUp" || e.key === "End" ? "last" : "first";
      show();
      return;
    }
    focusItem(next);
  }
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  if (menu) menu.addEventListener("toggle", onToggle);
  return {
    open: show,
    close: hide,
    isOpen: () => open,
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      if (menu) menu.removeEventListener("toggle", onToggle);
    }
  };
}

// ../../packages/components/src/command-palette.js
var INPUT = '[data-bn="command-input"]';
var ITEM3 = '[data-bn="command-item"]';
var GROUP = '[data-bn="command-group"]';
var LABEL = '[data-bn="command-label"]';
function closestFrom5(target, selector) {
  return target && typeof target.closest === "function" ? target.closest(selector) : null;
}
function labelOf(item) {
  const label = item.querySelector(LABEL);
  return String((label ?? item).textContent ?? "");
}
function parseHotkey(hotkey) {
  const parts = String(hotkey).split("+").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const key = parts.pop() ?? "";
  return { key, mod: parts.includes("mod"), ctrl: parts.includes("ctrl"), meta: parts.includes("meta"), shift: parts.includes("shift"), alt: parts.includes("alt") };
}
function hotkeyMatches(spec, e) {
  if (String(e.key ?? "").toLowerCase() !== spec.key) return false;
  if (spec.mod && !(e.metaKey || e.ctrlKey)) return false;
  if (spec.ctrl && !e.ctrlKey) return false;
  if (spec.meta && !e.metaKey) return false;
  return spec.shift === Boolean(e.shiftKey) && spec.alt === Boolean(e.altKey);
}
function initCommandPalette(dialog, options = {}) {
  const { onSelect, hotkey } = options;
  const doc = dialog.ownerDocument ?? (typeof document === "undefined" ? null : document);
  const input = dialog.querySelector(INPUT);
  const items = () => Array.from(dialog.querySelectorAll(ITEM3));
  const groups = () => Array.from(dialog.querySelectorAll(GROUP));
  const visible = () => items().filter((item) => !item.hasAttribute("hidden"));
  const isOpen = () => dialog.hasAttribute("open");
  let active = null;
  const prefix = dialog.getAttribute("id") || "bn-command";
  items().forEach((item, i) => {
    if (!item.getAttribute("id")) item.setAttribute("id", `${prefix}-item-${i}`);
  });
  function setActive(item) {
    active = item ?? null;
    for (const it of items()) {
      if (it === active) it.setAttribute("aria-selected", "true");
      else it.removeAttribute("aria-selected");
    }
    if (input) {
      if (active) input.setAttribute("aria-activedescendant", active.getAttribute("id"));
      else input.removeAttribute("aria-activedescendant");
    }
    if (active && typeof active.scrollIntoView === "function") active.scrollIntoView({ block: "nearest" });
  }
  function filter(query) {
    const q = String(query ?? "").trim().toLowerCase();
    for (const item of items()) {
      if (q === "" || labelOf(item).toLowerCase().includes(q)) item.removeAttribute("hidden");
      else item.setAttribute("hidden", "");
    }
    for (const group of groups()) {
      const any = Array.from(group.querySelectorAll(ITEM3)).some((item) => !item.hasAttribute("hidden"));
      if (any) group.removeAttribute("hidden");
      else group.setAttribute("hidden", "");
    }
    const list = visible();
    setActive(list[0] ?? null);
    return list;
  }
  function close() {
    if (!isOpen()) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }
  function open() {
    if (!isOpen()) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (input) {
      input.value = "";
      if (typeof input.focus === "function") input.focus();
    }
    filter("");
  }
  function activate(item) {
    if (!item) return;
    close();
    if (onSelect) onSelect(item.getAttribute("data-action") ?? "", item);
  }
  function onInput(e) {
    if (input && e.target === input) filter(input.value);
  }
  function onClick(e) {
    const item = closestFrom5(e.target, ITEM3);
    if (!item || item.hasAttribute("hidden")) return;
    e.preventDefault();
    activate(item);
  }
  function onKeydown(e) {
    const list = visible();
    const index = list.indexOf(active);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (list.length) setActive(list[(index + 1) % list.length]);
        return;
      case "ArrowUp":
        e.preventDefault();
        if (list.length) setActive(list[(index - 1 + list.length) % list.length]);
        return;
      case "Enter":
        e.preventDefault();
        activate(list.includes(active) ? active : list[0]);
        return;
      case "Escape":
        e.preventDefault();
        close();
        return;
      default:
    }
  }
  const spec = hotkey ? parseHotkey(hotkey) : null;
  function onHotkey(e) {
    if (!spec || !hotkeyMatches(spec, e)) return;
    e.preventDefault();
    if (isOpen()) close();
    else open();
  }
  filter(input ? input.value ?? "" : "");
  dialog.addEventListener("input", onInput);
  dialog.addEventListener("click", onClick);
  dialog.addEventListener("keydown", onKeydown);
  if (spec && doc) doc.addEventListener("keydown", onHotkey);
  return {
    open,
    close,
    isOpen,
    filter,
    active: () => active ? active.getAttribute("data-action") ?? "" : null,
    destroy() {
      dialog.removeEventListener("input", onInput);
      dialog.removeEventListener("click", onClick);
      dialog.removeEventListener("keydown", onKeydown);
      if (spec && doc) doc.removeEventListener("keydown", onHotkey);
    }
  };
}

// ../../packages/components/src/internal/drag.js
function bindDrag(el, handlers) {
  const entries = Object.entries(handlers).filter(([, fn]) => typeof fn === "function");
  for (const [type, fn] of entries) el.addEventListener(type, fn);
  return {
    destroy() {
      for (const [type, fn] of entries) el.removeEventListener(type, fn);
    }
  };
}
function clearDragState(container) {
  container.querySelectorAll("[data-dragging], [data-picked], [data-drop-target]").forEach((el) => {
    el.removeAttribute("data-dragging");
    el.removeAttribute("data-picked");
    el.removeAttribute("data-drop-target");
  });
}
function clearDropTargets(container) {
  if (typeof container.querySelectorAll !== "function") return;
  container.querySelectorAll("[data-drop-target]").forEach((el) => el.removeAttribute("data-drop-target"));
}
function readDragData(e) {
  try {
    return JSON.parse(e.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }
}

// ../../packages/components/src/calendar.js
var DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
var pad = (n) => String(n).padStart(2, "0");
function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  const m = DATE_ONLY.exec(String(value));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}
function toLocalDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDay(dateStr) {
  const d = parseLocalDate(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}
function slotMinute(e, slot, snap) {
  const rect = typeof slot.getBoundingClientRect === "function" ? slot.getBoundingClientRect() : null;
  if (!rect || !(rect.height > 0) || typeof e.clientY !== "number") return 0;
  const fraction = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
  const step = snap > 1 ? snap : 1;
  return Math.min(Math.floor(fraction * 60 / step) * step, 59);
}
function shiftDate(date, days) {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}
function clockText(hour, minute) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}
var isActivate = (e) => e.key === "Enter" || e.key === " " || e.key === "Spacebar";
var KEY_MOVES = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
function announce(container, bn, text) {
  const region = typeof container.querySelector === "function" ? container.querySelector(`[data-bn="${bn}"]`) : null;
  if (region) region.textContent = text;
}
function itemLabel(el, fallback) {
  const title = typeof el.getAttribute === "function" ? el.getAttribute("title") : null;
  return title || fallback;
}
function initCalendarDragDrop(container, callbacks = {}) {
  const { onDrop, dragSource, snapMinutes = 15 } = callbacks;
  const step = snapMinutes > 1 ? snapMinutes : 1;
  const say = (text) => announce(container, "calendar-status", text);
  const query = (selector) => typeof container.querySelector === "function" ? container.querySelector(selector) : null;
  const slotAt = (date, hour) => query(`[data-bn="calendar-slot"][data-date="${date}"][data-hour="${hour}"]`);
  let picked = null;
  let target = null;
  function itemOf(node) {
    const event = node.closest("[data-event-id]");
    if (event) return { type: "event", id: event.dataset.eventId, el: event };
    const block = node.closest("[data-block-id]");
    if (block) return { type: "pipeline", id: block.dataset.blockId, el: block };
    return null;
  }
  const label = () => itemLabel(picked.el, picked.id);
  function release() {
    if (picked) picked.el.removeAttribute("data-picked");
    picked = null;
    target = null;
    clearDropTargets(container);
  }
  function cancel() {
    if (!picked) return;
    const moved = label();
    release();
    say(`Cancelled moving ${moved}.`);
  }
  function initialTarget(el) {
    const { date, hour, minute } = el.dataset ?? {};
    if (date && hour != null) return { date, hour: parseInt(hour, 10), minute: parseInt(minute, 10) || 0 };
    const first = query('[data-bn="calendar-slot"]');
    return first ? { date: first.dataset.date, hour: parseInt(first.dataset.hour, 10), minute: 0 } : null;
  }
  function showTarget() {
    clearDropTargets(container);
    const slot = target && slotAt(target.date, target.hour);
    if (slot) slot.setAttribute("data-drop-target", "");
  }
  function pick(item) {
    release();
    picked = item;
    item.el.setAttribute("data-picked", "");
    target = initialTarget(item.el);
    showTarget();
    say(
      target ? `Picked up ${label()}. Use the arrow keys to choose a new time, Enter to drop, Escape to cancel.` : `Picked up ${label()}. Choose a time slot to drop it on, or press Escape to cancel.`
    );
  }
  function place(date, hour, minute) {
    const moved = label();
    const sourceType = picked.type;
    const eventId = picked.id;
    release();
    if (onDrop) {
      onDrop({
        eventId,
        date,
        hour,
        minute,
        datetime: `${date}T${pad(hour)}:${pad(minute)}`,
        sourceType
      });
    }
    say(`Moved ${moved} to ${formatDay(date)} at ${clockText(hour, minute)}.`);
  }
  function shiftTarget(from, days, minutes) {
    let minute = from.minute + minutes;
    const carry = Math.floor(minute / 60);
    minute -= carry * 60;
    return { date: days ? shiftDate(from.date, days) : from.date, hour: from.hour + carry, minute };
  }
  function dragstart(e) {
    release();
    const event = e.target.closest("[data-event-id]");
    const block = e.target.closest("[data-block-id]");
    if (event) {
      e.dataTransfer.setData("text/plain", JSON.stringify({
        type: "event",
        id: event.dataset.eventId
      }));
      e.dataTransfer.effectAllowed = "move";
      event.setAttribute("data-dragging", "");
    } else if (block) {
      e.dataTransfer.setData("text/plain", JSON.stringify({
        type: "pipeline",
        id: block.dataset.blockId
      }));
      e.dataTransfer.effectAllowed = "copy";
      block.setAttribute("data-dragging", "");
    }
  }
  function click(e) {
    const item = itemOf(e.target);
    if (item) {
      if (picked && picked.el === item.el) cancel();
      else pick(item);
      return;
    }
    if (!picked) return;
    const slot = e.target.closest('[data-bn="calendar-slot"]');
    if (slot) place(slot.dataset.date, parseInt(slot.dataset.hour, 10), slotMinute(e, slot, snapMinutes));
  }
  function keydown(e) {
    if (e.key === "Escape") {
      if (picked) {
        e.preventDefault();
        cancel();
      }
      return;
    }
    if (isActivate(e)) {
      const item = itemOf(e.target);
      if (picked && (!item || item.el === picked.el)) {
        e.preventDefault();
        if (target) place(target.date, target.hour, target.minute);
        return;
      }
      if (item) {
        e.preventDefault();
        pick(item);
      }
      return;
    }
    const move = KEY_MOVES[e.key];
    if (!move || !picked || !target) return;
    e.preventDefault();
    const next = shiftTarget(target, move[0], move[1] * step);
    if (!slotAt(next.date, next.hour)) return;
    target = next;
    showTarget();
    say(`${formatDay(next.date)} at ${clockText(next.hour, next.minute)}. Press Enter to drop ${label()} here.`);
  }
  const handle = bindDrag(container, {
    dragstart,
    dragover(e) {
      const slot = e.target.closest('[data-bn="calendar-slot"]');
      if (slot) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.setAttribute("data-drop-target", "");
      }
    },
    dragleave(e) {
      const slot = e.target.closest('[data-bn="calendar-slot"]');
      if (slot) {
        slot.removeAttribute("data-drop-target");
      }
    },
    drop(e) {
      e.preventDefault();
      const slot = e.target.closest('[data-bn="calendar-slot"]');
      if (!slot) return;
      slot.removeAttribute("data-drop-target");
      const data = readDragData(e);
      if (data && onDrop) {
        const hour = parseInt(slot.dataset.hour, 10);
        const minute = slotMinute(e, slot, snapMinutes);
        onDrop({
          eventId: data.id,
          date: slot.dataset.date,
          hour,
          minute,
          datetime: `${slot.dataset.date}T${pad(hour)}:${pad(minute)}`,
          sourceType: data.type
        });
      }
    },
    dragend() {
      release();
      clearDragState(container);
    },
    click,
    keydown
  });
  const outside = (fn) => (e) => {
    if (typeof container.contains === "function" && container.contains(e.target)) return;
    fn(e);
  };
  const source = dragSource && dragSource !== container ? bindDrag(dragSource, {
    dragstart: outside(dragstart),
    dragend() {
      release();
      clearDragState(dragSource);
      clearDragState(container);
    },
    click: outside(click),
    keydown: outside(keydown)
  }) : null;
  return {
    destroy() {
      handle.destroy();
      if (source) source.destroy();
    }
  };
}
function dropPosition(e, cardArea, draggedId) {
  const all = typeof cardArea.querySelectorAll === "function" ? Array.from(cardArea.querySelectorAll("[data-card-id]")) : [];
  const others = all.filter((c) => c.dataset?.cardId !== draggedId);
  const over = e.target.closest("[data-card-id]");
  if (!over) return others.length;
  if (over.dataset?.cardId === draggedId) return Math.max(all.indexOf(over), 0);
  const index = others.indexOf(over);
  if (index < 0) return others.length;
  const rect = typeof over.getBoundingClientRect === "function" ? over.getBoundingClientRect() : null;
  const below = Boolean(rect && rect.height > 0 && typeof e.clientY === "number" && e.clientY > rect.top + rect.height / 2);
  return below ? index + 1 : index;
}
function initPipelineDragDrop(container, callbacks = {}) {
  const { onCardMove } = callbacks;
  const say = (text) => announce(container, "pipeline-status", text);
  const queryAll = (root, selector) => typeof root.querySelectorAll === "function" ? Array.from(root.querySelectorAll(selector)) : [];
  const queryOne = (root, selector) => typeof root.querySelector === "function" ? root.querySelector(selector) : null;
  const columns = () => queryAll(container, "[data-column-id]");
  const columnOf = (columnId) => columns().find((c) => c.dataset?.columnId === columnId) ?? null;
  const columnTitle = (column) => queryOne(column, '[data-bn="pipeline-column-title"]')?.textContent || column.dataset.columnId;
  let picked = null;
  let target = null;
  const label = () => itemLabel(picked.el, picked.id);
  const othersIn = (column) => queryAll(column, "[data-card-id]").filter((c) => c.dataset?.cardId !== picked.id);
  function release() {
    if (picked) picked.el.removeAttribute("data-picked");
    picked = null;
    target = null;
    clearDropTargets(container);
  }
  function cancel() {
    if (!picked) return;
    const moved = label();
    release();
    say(`Cancelled moving ${moved}.`);
  }
  function showTarget() {
    clearDropTargets(container);
    const column = target && columnOf(target.columnId);
    const area = column && queryOne(column, '[data-bn="pipeline-column-cards"]');
    if (area) area.setAttribute("data-drop-target", "");
  }
  function pick(card) {
    release();
    picked = { id: card.dataset.cardId, el: card };
    card.setAttribute("data-picked", "");
    const column = card.closest("[data-column-id]");
    if (column) {
      target = { columnId: column.dataset.columnId, position: Math.max(queryAll(column, "[data-card-id]").indexOf(card), 0) };
    } else {
      const first = columns()[0];
      target = first ? { columnId: first.dataset.columnId, position: 0 } : null;
    }
    showTarget();
    say(`Picked up ${label()}. Use the arrow keys to choose a column and position, Enter to drop, Escape to cancel.`);
  }
  function place(columnId, position) {
    const moved = label();
    const cardId = picked.id;
    const column = columnOf(columnId);
    release();
    if (onCardMove) onCardMove({ cardId, targetColumnId: columnId, position });
    say(`Moved ${moved} to ${column ? columnTitle(column) : columnId}, position ${position + 1}.`);
  }
  function click(e) {
    const card = e.target.closest("[data-card-id]");
    if (card && (!picked || picked.el === card)) {
      if (picked) cancel();
      else pick(card);
      return;
    }
    if (!picked) return;
    const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
    const column = cardArea && cardArea.closest("[data-column-id]");
    if (column) place(column.dataset.columnId, dropPosition(e, cardArea, picked.id));
  }
  function keydown(e) {
    if (e.key === "Escape") {
      if (picked) {
        e.preventDefault();
        cancel();
      }
      return;
    }
    if (isActivate(e)) {
      const card = e.target.closest("[data-card-id]");
      if (picked && (!card || card === picked.el)) {
        e.preventDefault();
        if (target) place(target.columnId, target.position);
        return;
      }
      if (card) {
        e.preventDefault();
        pick(card);
      }
      return;
    }
    const move = KEY_MOVES[e.key];
    if (!move || !picked || !target) return;
    e.preventDefault();
    const all = columns();
    const column = all[all.findIndex((c) => c.dataset?.columnId === target.columnId) + move[0]];
    if (!column) return;
    const max = othersIn(column).length;
    const position = Math.min(Math.max(target.position + move[1], 0), max);
    target = { columnId: column.dataset.columnId, position };
    showTarget();
    say(`${columnTitle(column)}, position ${position + 1} of ${max + 1}. Press Enter to drop ${label()} here.`);
  }
  return bindDrag(container, {
    dragstart(e) {
      const card = e.target.closest("[data-card-id]");
      if (!card) return;
      release();
      e.dataTransfer.setData("text/plain", JSON.stringify({
        type: "pipeline-card",
        cardId: card.dataset.cardId
      }));
      e.dataTransfer.effectAllowed = "move";
      card.setAttribute("data-dragging", "");
    },
    dragover(e) {
      const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
      if (cardArea) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        cardArea.setAttribute("data-drop-target", "");
      }
    },
    dragleave(e) {
      if (!e.target.closest("[data-card-id]")) {
        clearDropTargets(container);
      }
    },
    drop(e) {
      e.preventDefault();
      const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
      if (!cardArea) return;
      cardArea.removeAttribute("data-drop-target");
      const data = readDragData(e);
      const targetColumn = cardArea.closest("[data-column-id]");
      if (data && onCardMove && targetColumn) {
        onCardMove({
          cardId: data.cardId,
          targetColumnId: targetColumn.dataset.columnId,
          position: dropPosition(e, cardArea, data.cardId)
        });
      }
    },
    dragend() {
      release();
      clearDragState(container);
    },
    click,
    keydown
  });
}
export {
  batch,
  browserFeatures,
  computed,
  createErrorBoundary,
  createLazyHydrator,
  createPluginRegistry,
  createVitalsReporter,
  debugAssert,
  debugDeps,
  debugEffect,
  debugSignal,
  debugTime,
  definePlugin,
  detectBrowserFeatures,
  disableDebug,
  disableDevtools,
  effect,
  emitDiagnostic,
  enableDebug,
  enableDevtools,
  getDebugStats,
  getDirective,
  hydrate,
  hydrateOnIdle,
  hydrateOnInteraction,
  hydrateOnMedia,
  initCalendarDragDrop,
  initCommandPalette,
  initDataGrid,
  initDrawer,
  initDropdownMenu,
  initMultiselect,
  initPipelineDragDrop,
  initTabs,
  initTree,
  initVirtualList,
  isDebugEnabled,
  isDevtoolsEnabled,
  lazyHydrate,
  listDirectives,
  observeCLS,
  observeFCP,
  observeFID,
  observeINP,
  observeLCP,
  observeTTFB,
  raw,
  recordHydration,
  registerDirective,
  registerPlugin,
  renderWithBoundary,
  reportHydrationMismatch,
  signal,
  supportsFeature,
  trackEffect,
  trackSignal,
  unregisterDirective
};
