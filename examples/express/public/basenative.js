// ../../packages/runtime/src/devtools-hooks.js
var devtoolsHooks = {
  trackSignal() {
  },
  trackEffect() {
  },
  recordHydration() {
  }
};

// ../../packages/runtime/src/signals.js
var currentEffect = null;
var batchDepth = 0;
var pendingComputed = /* @__PURE__ */ new Set();
var pendingEffects = /* @__PURE__ */ new Set();
var wave = null;
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
function loopError() {
  const error = new Error("Use .peek() or write a different signal.");
  error.code = "BN_EFFECT_LOOP";
  return error;
}
function scheduleEffect(effectRef) {
  if (effectRef === currentEffect) throw loopError();
  if (wave && wave.has(effectRef)) return;
  (effectRef.computed ? pendingComputed : pendingEffects).add(effectRef);
}
function runQueued(queue) {
  const effects = [...queue];
  queue.clear();
  wave = new Set(effects);
  for (const effectRef of effects) {
    wave.delete(effectRef);
    effectRef.run();
  }
}
function flushEffects() {
  batchDepth++;
  try {
    for (let passes = 0; pendingComputed.size || pendingEffects.size; ) {
      if (++passes > 1e4) {
        pendingComputed.clear();
        pendingEffects.clear();
        throw loopError();
      }
      runQueued(pendingComputed.size ? pendingComputed : pendingEffects);
    }
  } finally {
    wave = null;
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
      batch(() => {
        for (const effectRef of [...subs]) scheduleEffect(effectRef);
      });
    }
  };
  accessor.peek = () => value;
  devtoolsHooks.trackSignal(accessor, void 0, () => subs.size);
  return accessor;
}
function createEffect(fn, computed2) {
  const effectRef = {
    computed: computed2,
    cleanup: null,
    disposed: false,
    subscriptions: /* @__PURE__ */ new Set(),
    run() {
      if (effectRef.disposed) return;
      const previous = currentEffect;
      currentEffect = effectRef;
      try {
        cleanupEffect(effectRef);
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
  devtoolsHooks.trackEffect(execute, void 0, () => effectRef.disposed);
  execute();
  return execute;
}
function computed(fn) {
  const s = signal(void 0);
  createEffect(() => s.set(fn()), true);
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
  return createEffect(fn, false);
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
function lookupIdentifier(ctx, name48) {
  if (ctx == null) return void 0;
  return resolveValue(ctx[name48]);
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
function isUrlAttribute(name48) {
  return URL_ATTRIBUTES.has(String(name48).toLowerCase());
}
function sanitizeUrl(value) {
  const stripped = String(value).replace(/[\u0000-\u0020\u007F-\u00A0]/g, "");
  return DANGEROUS_SCHEME.test(stripped) ? null : String(value);
}
function mergeClass(staticClass, dynamic) {
  const base = staticClass == null ? "" : String(staticClass).trim();
  const extra = dynamic === false || dynamic == null ? "" : String(unwrapRaw(dynamic)).trim();
  if (!base) return extra;
  if (!extra) return base;
  return `${base} ${extra}`;
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
function registerDirective(name48, config = {}) {
  if (typeof name48 !== "string" || name48 === "") {
    throw new Error("registerDirective: name must be a non-empty string.");
  }
  if (registry.has(name48)) {
    throw new Error(`Directive "@${name48}" is already registered.`);
  }
  if (typeof config.server !== "function" && typeof config.client !== "function") {
    throw new Error(`Directive "@${name48}" needs a "server" and/or "client" handler function.`);
  }
  registry.set(name48, {
    on: config.on === "template" ? "template" : "element",
    server: typeof config.server === "function" ? config.server : void 0,
    client: typeof config.client === "function" ? config.client : void 0
  });
}
function unregisterDirective(name48) {
  registry.delete(name48);
}
function getDirective(name48) {
  return registry.get(name48);
}
function listDirectives() {
  return [...registry.keys()];
}

// ../../packages/runtime/src/bind.js
function syncFormControlProperty(node, attrName, result) {
  if (attrName === "value" && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "SELECT")) {
    const value = result === false || result == null ? "" : String(result);
    if (node.value !== value) node.value = value;
  } else if (attrName === "checked" && node.tagName === "INPUT") {
    node.checked = !(result === false || result == null || result === "false");
  }
}
function bindNode(node, ctx, options) {
  let processed = 0;
  if (node.nodeType === Node.TEXT_NODE) {
    const source = node.textContent;
    if (source.includes("{{")) {
      let inserted = [];
      const runner = effect(() => {
        const result = interpolate(source, ctx, options);
        for (const child of inserted) child.remove();
        inserted = [];
        if (isRaw(result)) {
          const template48 = document.createElement("template");
          template48.innerHTML = unwrapRaw(result);
          inserted = [...template48.content.childNodes];
          node.after(template48.content);
          node.textContent = "";
        } else {
          node.textContent = result;
        }
      });
      registerCleanup(node, () => {
        runner.dispose?.();
        for (const child of inserted) child.remove();
        inserted = [];
      });
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
      const staticClass = attrName === "class" ? node.getAttribute("class") : null;
      const runner = effect(() => {
        const result = evaluate(expr, ctx, options);
        if (attrName === "class") {
          const merged = mergeClass(staticClass, result);
          if (merged) node.setAttribute("class", merged);
          else node.removeAttribute("class");
          return;
        }
        if (result === false || result == null) {
          node.removeAttribute(attrName);
          syncFormControlProperty(node, attrName, result);
          return;
        }
        const resolved = unwrapRaw(result);
        if (isUrlAttribute(attrName) && sanitizeUrl(resolved) === null) {
          node.removeAttribute(attrName);
          return;
        }
        node.setAttribute(attrName, resolved);
        syncFormControlProperty(node, attrName, resolved);
      });
      registerCleanup(node, () => runner.dispose?.());
      node.removeAttribute(attr.name);
      processed++;
    } else if (attr.value.includes("{{")) {
      const raw2 = attr.value;
      const name48 = attr.name;
      const runner = effect(() => {
        node.setAttribute(name48, interpolate(raw2, ctx, options));
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
function cloneAndHydrate(template48, ctx, options) {
  const fragment = template48.content.cloneNode(true);
  hydrateChildren(fragment, ctx, options);
  return [...fragment.childNodes];
}
function createBlock(template48, ctx, options, label = "@for:item") {
  const fragment = document.createDocumentFragment();
  const start = document.createComment(label);
  const end = document.createComment(`${label}:end`);
  const nodes = cloneAndHydrate(template48, ctx, options);
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
function renderUntrackedList(state, anchor, template48, emptyNode, ctx, options, itemName, list) {
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
    const nodes = cloneAndHydrate(template48, itemCtx, options);
    insertAfterAnchor(cursor, nodes);
    cursor = nodes[nodes.length - 1] ?? cursor;
    state.rendered.push(...nodes);
  }
}
function reconcileTrackedList(state, anchor, template48, emptyNode, ctx, options, itemName, list, trackExpr) {
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
      renderUntrackedList(state, anchor, template48, emptyNode, ctx, options, itemName, list);
      return;
    }
    seenKeys.add(key);
    let block = previousBlocks.get(key);
    if (block) {
      previousBlocks.delete(key);
      updateLoopContext(block.slots, itemName, item, index, list.length);
    } else {
      const loopState = createLoopContext(ctx, itemName, item, index, list.length);
      block = createBlock(template48, loopState.ctx, options);
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
  for (const name48 of listDirectives()) {
    const directive = getDirective(name48);
    if (directive?.on === "template" && node.hasAttribute(`@${name48}`)) {
      return { name: name48, directive };
    }
  }
  return null;
}
function mountDirectiveBlockTemplate(templateNode, name48, directive, ctx, options) {
  const value = templateNode.getAttribute(`@${name48}`);
  let elseNode = null;
  const next = templateNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@else")) {
    elseNode = next;
    elseNode.remove();
  }
  const anchor = document.createComment(`@${name48}`);
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
function hasHydrationMarkers(root48) {
  const SHOW_COMMENT = globalThis.NodeFilter?.SHOW_COMMENT ?? 128;
  const walker = document.createTreeWalker(root48, SHOW_COMMENT);
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
function hydrateDeferred(root48, ctx, options) {
  const existing = root48.querySelectorAll?.("[data-bn-defer]") ?? [];
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
    const target = root48.querySelector?.(`[data-bn-defer-resolve="${id}"] ~ [data-bn-defer="${id}"]`) ?? root48.querySelector?.(`div[data-bn-defer="${id}"]`);
    if (!target) return;
    hydrateChildren(target, ctx, options);
  }
  document.addEventListener("bn:defer", onDefer);
  return () => document.removeEventListener("bn:defer", onDefer);
}
function hydrate(root48, ctx, options = {}) {
  const runtimeOptions = createRuntimeOptions(options);
  const startedAt = Date.now();
  const processed = hydrateChildren(root48, ctx, runtimeOptions);
  devtoolsHooks.recordHydration(root48, { directivesProcessed: processed, duration: Date.now() - startedAt });
  const cleanupDeferred = hydrateDeferred(root48, ctx, runtimeOptions);
  if (processed === 0) {
    const markerMessage = hasHydrationMarkers(root48) ? "hydrate() found server render markers but no template source; this build can diagnose SSR boundaries, but it still recovers by client-side template hydration only" : "hydrate() found no BaseNative template directives in the target root";
    reportHydrationMismatch(runtimeOptions, markerMessage, {
      code: hasHydrationMarkers(root48) ? "BN_HYDRATE_MARKERS_WITHOUT_TEMPLATE" : "BN_HYDRATE_NO_DIRECTIVES"
    });
  }
  return () => {
    cleanupDeferred();
    disposeNodeTree(root48);
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
function supportsFeature(name48, target = globalThis) {
  return Boolean(detectBrowserFeatures(target)[name48]);
}
var browserFeatures = /* @__PURE__ */ detectBrowserFeatures();

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
  function addDirective(name48, handler) {
    if (typeof name48 !== "string" || name48 === "") {
      throw new Error("Directive name must be a non-empty string.");
    }
    if (typeof handler !== "function") {
      throw new Error(`Directive handler for "${name48}" must be a function.`);
    }
    directives.set(name48, handler);
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
  function getDirective2(name48) {
    return directives.get(name48);
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
function debugSignal(s, name48 = "signal") {
  stats.signalsCreated++;
  log("debug", `signal:${name48} created`, `(${s()})`);
  const wrapped = () => {
    if (_config.trackReads) {
      stats.signalReads++;
      log("debug", `signal:${name48} read \u2192`, s());
    }
    return s();
  };
  wrapped.set = (next) => {
    const before = s();
    s.set(next);
    const after = s();
    if (_debugEnabled) {
      stats.signalWrites++;
      log("debug", `signal:${name48} set`, before, "\u2192", after);
    }
  };
  wrapped.peek = () => s.peek();
  return wrapped;
}
function debugEffect(fn, name48 = "effect") {
  stats.effectsCreated++;
  let runCount = 0;
  const handle = effect(() => {
    runCount++;
    stats.effectRuns++;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    log("debug", `effect:${name48} run #${runCount} started`);
    const result = fn();
    const duration = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
    log("debug", `effect:${name48} run #${runCount} done (${duration.toFixed(2)}ms)`);
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
function debugDeps(s, name48 = "signal") {
  if (!_debugEnabled) return;
  const value = typeof s === "function" ? s() : s;
  log("info", `deps:${name48} current value:`, value);
}

// ../../packages/components/src/accordion/index.js
var name = "accordion";
var root = "details";
function create(props) {
  if (!props.summary) throw new TypeError("accordion: summary is required");
  const summary = signal(props.summary);
  const bodyHtml = signal(props.bodyHtml ?? "");
  const open = signal(props.open ?? false);
  const variant = signal(props.variant ?? "default");
  return { summary, bodyHtml, open, variant, raw };
}
function registerVariants(registry3) {
  registry3.registerVariant("accordion", "default");
}
var template = new URL("./index.html", import.meta.url);
var styles = new URL("./styles.css", import.meta.url);
var accordion = { name, root, create, registerVariants, template, styles };

// ../../packages/components/src/alert/index.js
var name2 = "alert";
var root2 = "aside";
function create2(props) {
  if (!props.title) throw new TypeError("alert: title is required");
  const title = signal(props.title);
  const body = signal(props.body ?? "");
  const variant = signal(props.variant ?? "info");
  const role = computed(() => variant() === "danger" ? "alert" : "status");
  const dismissHtml = signal(props.dismissHtml ?? "");
  const hasDismiss = computed(() => dismissHtml() !== "");
  function dismiss(event) {
    if (!event.target?.closest?.("button")) return;
    const aside = (event.currentTarget ?? event.target)?.closest?.("aside");
    aside?.remove();
  }
  return { title, body, variant, role, dismissHtml, hasDismiss, dismiss, raw };
}
function registerVariants2(registry3) {
  registry3.registerVariant("alert", "info");
  registry3.registerVariant("alert", "success");
  registry3.registerVariant("alert", "warning");
  registry3.registerVariant("alert", "danger");
}
var template2 = new URL("./index.html", import.meta.url);
var styles2 = new URL("./styles.css", import.meta.url);
var alert = { name: name2, root: root2, create: create2, registerVariants: registerVariants2, template: template2, styles: styles2 };

// ../../packages/components/src/app-bar/index.js
var name3 = "app-bar";
var root3 = "nav";
var MORE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
function create3(props) {
  if (!Array.isArray(props.items) || props.items.length === 0) {
    throw new TypeError("app-bar: items is required");
  }
  const limit = props.barLimit ?? 4;
  const enrich = (item) => ({
    ...item,
    iconHtml: item.iconHtml ?? "",
    ariaCurrent: item.current ? "page" : false
  });
  const primaryItems = signal(props.items.slice(0, limit).map(enrich));
  const overflowItems = signal(props.items.slice(limit).map(enrich));
  const label = signal(props.label ?? "Primary");
  const moreLabel = signal(props.moreLabel ?? "More");
  const variant = signal(props.variant ?? "app-bar");
  const id = signal(props.id ?? "app-bar");
  const hasOverflow = computed(() => overflowItems().length > 0);
  const moreAriaCurrent = computed(() => overflowItems().some((item) => item.ariaCurrent === "page") ? "page" : false);
  const moreId = computed(() => `${id()}-more`);
  const moreButtonId = computed(() => `${id()}-more-btn`);
  const moreIconHtml = signal(MORE_ICON);
  return {
    primaryItems,
    overflowItems,
    label,
    moreLabel,
    variant,
    hasOverflow,
    moreAriaCurrent,
    moreId,
    moreButtonId,
    moreIconHtml,
    raw
  };
}
function registerVariants3(registry3) {
  registry3.registerVariant("app-bar", "app-bar");
}
var template3 = new URL("./index.html", import.meta.url);
var styles3 = new URL("./styles.css", import.meta.url);
var appBar = { name: name3, root: root3, create: create3, registerVariants: registerVariants3, template: template3, styles: styles3 };

// ../../packages/components/src/app-shell/index.js
var name4 = "app-shell";
var root4 = "main";
function create4(props) {
  if (!props.sidebarHtml) throw new TypeError("app-shell: sidebarHtml is required \u2014 render the sidebar into it");
  if (!props.appBarHtml) throw new TypeError("app-shell: appBarHtml is required \u2014 render the app bar into it");
  if (!props.contentHtml) throw new TypeError("app-shell: contentHtml is required");
  const sidebarHtml = signal(props.sidebarHtml);
  const appBarHtml = signal(props.appBarHtml);
  const contentHtml = signal(props.contentHtml);
  const variant = signal(props.variant ?? "default");
  const mainId = signal(props.mainId ?? false);
  return { sidebarHtml, appBarHtml, contentHtml, variant, mainId, raw };
}
function registerVariants4(registry3) {
  registry3.registerVariant("app-shell", "default");
}
var template4 = new URL("./index.html", import.meta.url);
var styles4 = new URL("./styles.css", import.meta.url);
var appShell = { name: name4, root: root4, create: create4, registerVariants: registerVariants4, template: template4, styles: styles4 };

// ../../packages/components/src/avatar/index.js
var name5 = "avatar";
var root5 = "figure";
function create5(props) {
  const src = signal(props.src ?? "");
  const alt = signal(props.alt ?? "");
  const initials = signal(props.initials ?? "");
  const variant = signal(props.variant ?? "default");
  const hasImage = computed(() => src() !== "");
  return { src, alt, initials, variant, hasImage };
}
function registerVariants5(registry3) {
  registry3.registerVariant("avatar", "default");
  for (let tone = 0; tone <= 7; tone += 1) registry3.registerVariant("avatar", `tone-${tone}`);
}
var template5 = new URL("./index.html", import.meta.url);
var styles5 = new URL("./styles.css", import.meta.url);
var avatar = { name: name5, root: root5, create: create5, registerVariants: registerVariants5, template: template5, styles: styles5 };

// ../../packages/components/src/badge/index.js
var name6 = "badge";
var root6 = "small";
function create6(props) {
  if (!props.label) throw new TypeError("badge: label is required");
  const label = signal(props.label);
  const variant = signal(props.variant ?? "default");
  return { label, variant };
}
function registerVariants6(registry3) {
  registry3.registerVariant("badge", "default");
  registry3.registerVariant("badge", "info");
  registry3.registerVariant("badge", "success");
  registry3.registerVariant("badge", "warning");
  registry3.registerVariant("badge", "danger");
}
var template6 = new URL("./index.html", import.meta.url);
var styles6 = new URL("./styles.css", import.meta.url);
var badge = { name: name6, root: root6, create: create6, registerVariants: registerVariants6, template: template6, styles: styles6 };

// ../../packages/components/src/breadcrumb/index.js
var name7 = "breadcrumb";
var root7 = "nav";
function create7(props) {
  if (!Array.isArray(props.items) || props.items.length === 0) {
    throw new TypeError("breadcrumb: items is required");
  }
  const items = signal(props.items);
  const label = signal(props.label ?? "Breadcrumb");
  const variant = signal(props.variant ?? "breadcrumb");
  return { items, label, variant };
}
function registerVariants7(registry3) {
  registry3.registerVariant("breadcrumb", "breadcrumb");
}
var template7 = new URL("./index.html", import.meta.url);
var styles7 = new URL("./styles.css", import.meta.url);
var breadcrumb = { name: name7, root: root7, create: create7, registerVariants: registerVariants7, template: template7, styles: styles7 };

// ../../packages/components/src/button/index.js
var name8 = "button";
var root8 = "button";
function create8(props) {
  if (!props.label) throw new TypeError("button: label is required");
  const label = signal(props.label);
  const variant = signal(props.variant ?? "default");
  const href = signal(props.href ?? "");
  const type = signal(props.type ?? "button");
  const disabled = signal(props.disabled ?? false);
  const isBusy = signal(props.busy ?? false);
  const isDisabled = computed(() => disabled() || isBusy());
  const hasHref = computed(() => href() !== "");
  const hrefAttr = computed(() => isDisabled() ? false : href());
  const disabledAttr = computed(() => isDisabled() ? "true" : false);
  function activate(event) {
    if (isDisabled.peek()) return;
    props.onActivate?.(event);
  }
  return { label, variant, type, disabled, isBusy, isDisabled, hasHref, hrefAttr, disabledAttr, activate };
}
function registerVariants8(registry3) {
  registry3.registerVariant("button", "default");
  registry3.registerVariant("button", "primary");
  registry3.registerVariant("button", "ghost");
  registry3.registerVariant("button", "destructive");
}
var template8 = new URL("./index.html", import.meta.url);
var styles8 = new URL("./styles.css", import.meta.url);
var button = { name: name8, root: root8, create: create8, registerVariants: registerVariants8, template: template8, styles: styles8 };

// ../../packages/components/src/calendar/index.js
var name9 = "calendar";
var root9 = "section";
var MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function create9(props) {
  if (!props.year || !props.month) throw new TypeError("calendar: year and month are required");
  const variant = signal(props.variant ?? "month");
  const prevHtml = signal(props.prevHtml ?? "");
  const nextHtml = signal(props.nextHtml ?? "");
  const bodyHtml = signal(props.bodyHtml ?? "");
  const todayIso = props.today ?? iso((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth() + 1, (/* @__PURE__ */ new Date()).getDate());
  const title = computed(() => `${MONTH_NAMES[props.month - 1]} ${props.year}`);
  const isMonth = computed(() => variant() === "month");
  const weeks = computed(() => {
    const first = new Date(Date.UTC(props.year, props.month - 1, 1));
    const start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    const grid = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w += 1) {
      const week = [];
      for (let d = 0; d < 7; d += 1) {
        const date = iso(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
        week.push({
          date,
          day: cursor.getUTCDate(),
          inMonth: cursor.getUTCMonth() === props.month - 1,
          isToday: date === todayIso,
          isSelected: date === props.selected
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  });
  const events = signal(props.events ?? []);
  const status = signal("");
  const days = computed(() => {
    const byDate = /* @__PURE__ */ new Map();
    for (const event of events()) {
      const list = byDate.get(event.date) ?? [];
      list.push(event);
      byDate.set(event.date, list);
    }
    return [...byDate.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([date, events2]) => {
      const [y, m, d] = date.split("-").map(Number);
      const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      return { date, label: `${weekday}, ${MONTH_NAMES[m - 1]} ${d}`, events: events2 };
    });
  });
  function moveEvent(eventId, target) {
    const event = events().find((entry) => (entry.id ?? entry.title) === eventId);
    if (!event) return false;
    const pad = (n) => String(n).padStart(2, "0");
    const datetime = `${target.date}T${pad(target.hour)}:${pad(target.minute)}`;
    const moved = {
      ...event,
      date: target.date,
      at: datetime,
      timeLabel: `${(target.hour + 11) % 12 + 1}:${pad(target.minute)} ${target.hour < 12 ? "AM" : "PM"}`
    };
    events.set(events().map((entry) => entry === event ? moved : entry));
    props.onDrop?.({
      eventId,
      date: target.date,
      hour: target.hour,
      minute: target.minute,
      datetime,
      sourceType: "event"
    });
    const [y, m, d] = target.date.split("-").map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    status.set(`Moved ${event.title} to ${weekday}, ${MONTH_NAMES[m - 1]} ${d} at ${moved.timeLabel}.`);
    return true;
  }
  return { title, prevHtml, nextHtml, bodyHtml, variant, isMonth, weeks, days, events, status, moveEvent, raw };
}
function registerVariants9(registry3) {
  registry3.registerVariant("calendar", "month");
  registry3.registerVariant("calendar", "schedule");
}
var template9 = new URL("./index.html", import.meta.url);
var styles9 = new URL("./styles.css", import.meta.url);
var calendar = { name: name9, root: root9, create: create9, registerVariants: registerVariants9, template: template9, styles: styles9 };

// ../../packages/components/src/card/index.js
var name10 = "card";
var root10 = "article";
function create10(props) {
  if (!props.title) throw new TypeError("card: title is required");
  const title = signal(props.title);
  const body = signal(props.body ?? "");
  const variant = signal(props.variant ?? "default");
  const footerHtml = signal(props.footerHtml ?? "");
  const hasFooter = computed(() => footerHtml().length > 0);
  return { title, body, variant, footerHtml, hasFooter, raw };
}
function registerVariants10(registry3) {
  registry3.registerVariant("card", "default");
  registry3.registerVariant("card", "floating");
}
var template10 = new URL("./index.html", import.meta.url);
var styles10 = new URL("./styles.css", import.meta.url);
var card = { name: name10, root: root10, create: create10, registerVariants: registerVariants10, template: template10, styles: styles10 };

// ../../packages/components/src/checkbox/index.js
var name11 = "checkbox";
var root11 = "input";
function create11(props) {
  if (!props.label) throw new TypeError("checkbox: label is required");
  const label = signal(props.label);
  const variant = signal("checkbox");
  const checked = signal(props.checked ?? false);
  const disabled = signal(props.disabled ?? false);
  function toggle2(event) {
    checked.set(event.target.checked);
    props.onToggle?.(event.target.checked);
  }
  return { label, variant, checked, disabled, toggle: toggle2 };
}
function registerVariants11(registry3) {
  registry3.registerVariant("checkbox", "checkbox");
}
var template11 = new URL("./index.html", import.meta.url);
var styles11 = new URL("./styles.css", import.meta.url);
var checkbox = { name: name11, root: root11, create: create11, registerVariants: registerVariants11, template: template11, styles: styles11 };

// ../../packages/components/src/choice-group/index.js
var name12 = "choice-group";
var root12 = "fieldset";
function create12(props) {
  if (!props.legend) throw new TypeError("choice-group: legend is required");
  if (!props.name) throw new TypeError("choice-group: name is required");
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError("choice-group: options must be a non-empty array");
  }
  for (const option of props.options) {
    if (!option.contentHtml) throw new TypeError("choice-group: every option needs contentHtml \u2014 render its substrate component");
  }
  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const inputType = signal(props.type ?? "radio");
  const options = signal(props.options);
  const variant = signal(props.variant ?? "choice-group");
  const values = signal(
    props.values ?? (props.value !== void 0 ? [props.value] : inputType() === "radio" ? [props.options[0].value] : [])
  );
  function isChecked(option) {
    return values().includes(option.value);
  }
  function change(option, event) {
    const selected = inputType() === "radio" ? true : event.target.checked;
    values.set(
      inputType() === "radio" ? [option.value] : selected ? [...values(), option.value] : values().filter((v) => v !== option.value)
    );
    props.onChange?.({
      name: groupName(),
      mode: inputType(),
      values: [...values()],
      changed: option.value,
      selected
    });
  }
  return { legend, groupName, inputType, options, variant, values, isChecked, change, raw };
}
function registerVariants12(registry3) {
  registry3.registerVariant("choice-group", "choice-group");
}
var template12 = new URL("./index.html", import.meta.url);
var styles12 = new URL("./styles.css", import.meta.url);
var choiceGroup = { name: name12, root: root12, create: create12, registerVariants: registerVariants12, template: template12, styles: styles12 };

// ../../packages/components/src/code-block/index.js
var name13 = "code-block";
var root13 = "figure";
function create13(props) {
  if (!props.code) throw new TypeError("code-block: code is required");
  const code = signal(props.code);
  const caption = signal(props.caption ?? "");
  const actionsHtml = signal(props.actionsHtml ?? "");
  const variant = signal(props.variant ?? "code");
  const hasHeader = computed(() => caption() !== "" || actionsHtml() !== "");
  return { code, caption, actionsHtml, variant, hasHeader, raw };
}
function registerVariants13(registry3) {
  registry3.registerVariant("code-block", "code");
}
var template13 = new URL("./index.html", import.meta.url);
var styles13 = new URL("./styles.css", import.meta.url);
var codeBlock = { name: name13, root: root13, create: create13, registerVariants: registerVariants13, template: template13, styles: styles13 };

// ../../packages/components/src/combobox/index.js
var name14 = "combobox";
var root14 = "section";
function create14(props) {
  if (!props.id) throw new TypeError("combobox: id is required");
  if (!props.inputHtml) throw new TypeError("combobox: inputHtml is required (render the input component)");
  const label = signal(props.label ?? "");
  const inputHtml = signal(props.inputHtml);
  const options = signal(props.options ?? []);
  const query = signal("");
  const open = signal(props.open ?? false);
  const activeValue = signal(props.activeValue ?? "");
  const value = signal("");
  const variant = signal(props.variant ?? "default");
  const listboxId = computed(() => `${props.id}-listbox`);
  const optionId = (option) => `${props.id}-option-${option.value}`;
  const visibleOptions = computed(() => {
    const q = query().trim().toLowerCase();
    if (q === "") return options();
    return options().filter((option) => option.label.toLowerCase().includes(q));
  });
  const activeOption = computed(() => visibleOptions().find((option) => option.value === activeValue()) ?? null);
  const activeDescendant = computed(() => {
    const active = activeOption();
    return open() && active ? optionId(active) : "";
  });
  const isActive = (option) => option.value === activeValue() ? "true" : "false";
  const select2 = (option) => {
    value.set(option.value);
    activeValue.set(option.value);
    open.set(false);
    props.onSelect?.({ value: option.value, label: option.label });
  };
  function choose(event, option) {
    select2(option);
    const root48 = (event.currentTarget ?? event.target)?.closest?.("section");
    const input2 = root48?.querySelector?.("input");
    if (input2) input2.value = option.label;
  }
  function onInput(event) {
    query.set(event.target?.value ?? "");
    if (!open()) open.set(true);
    const first = visibleOptions()[0];
    activeValue.set(first ? first.value : "");
  }
  function onFocus() {
    query.set("");
    if (!open()) open.set(true);
  }
  function moveActive(delta) {
    const list = visibleOptions();
    if (list.length === 0) return;
    const index = list.findIndex((option) => option.value === activeValue());
    const next = list[(index + delta + list.length) % list.length];
    activeValue.set(next.value);
  }
  function onKeydown(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open()) {
          open.set(true);
          if (!activeOption() && visibleOptions().length > 0) activeValue.set(visibleOptions()[0].value);
        } else moveActive(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open()) {
          open.set(true);
          if (!activeOption() && visibleOptions().length > 0) activeValue.set(visibleOptions()[visibleOptions().length - 1].value);
        } else moveActive(-1);
        return;
      case "Home":
        if (!open() || visibleOptions().length === 0) return;
        event.preventDefault();
        activeValue.set(visibleOptions()[0].value);
        return;
      case "End":
        if (!open() || visibleOptions().length === 0) return;
        event.preventDefault();
        activeValue.set(visibleOptions()[visibleOptions().length - 1].value);
        return;
      case "Enter": {
        const active = activeOption();
        if (open() && active) {
          event.preventDefault();
          select2(active);
          const target = event.target;
          if (target && "value" in target) target.value = active.label;
        }
        return;
      }
      case "Escape":
        if (open()) {
          event.preventDefault();
          open.set(false);
        }
        return;
      default:
    }
  }
  return {
    label,
    inputHtml,
    options,
    query,
    visibleOptions,
    open,
    activeValue,
    activeOption,
    activeDescendant,
    value,
    variant,
    listboxId,
    optionId,
    isActive,
    select: select2,
    choose,
    moveActive,
    onKeydown,
    onInput,
    onFocus,
    raw
  };
}
function registerVariants14(registry3) {
  registry3.registerVariant("combobox", "default");
}
var template14 = new URL("./index.html", import.meta.url);
var styles14 = new URL("./styles.css", import.meta.url);
var combobox = { name: name14, root: root14, create: create14, registerVariants: registerVariants14, template: template14, styles: styles14 };

// ../../packages/components/src/command-palette/index.js
var name15 = "command-palette";
var root15 = "dialog";
function create15(props) {
  if (!props.id) throw new TypeError("command-palette: id is required");
  if (!props.searchHtml)
    throw new TypeError("command-palette: searchHtml is required (render the field + input)");
  const label = signal(props.label ?? "");
  const searchHtml = signal(props.searchHtml);
  const groups = signal(props.groups ?? []);
  const query = signal("");
  const variant = signal(props.variant ?? "command-palette");
  const dialogId = signal(`${props.id}-dialog`);
  const visibleGroups = computed(() => {
    const q = query().trim().toLowerCase();
    if (q === "") return groups();
    return groups().map((group) => ({
      ...group,
      options: group.options.filter((option) => option.label.toLowerCase().includes(q))
    })).filter((group) => group.options.length > 0);
  });
  const flatOptions = computed(() => visibleGroups().flatMap((group) => group.options));
  const activeValue = signal(props.activeValue ?? "");
  const activeOption = computed(() => {
    const list = flatOptions();
    return list.find((option) => option.value === activeValue()) ?? list[0] ?? null;
  });
  const activeDescendant = computed(() => {
    const active = activeOption();
    return active ? `${props.id}-option-${active.value}` : "";
  });
  const optionId = (option) => `${props.id}-option-${option.value}`;
  const isActive = (option) => option.value === activeOption()?.value ? "true" : "false";
  const select2 = (option) => {
    props.onSelect?.({ value: option.value, label: option.label });
  };
  function setQuery(value) {
    query.set(value ?? "");
    const first = flatOptions()[0];
    activeValue.set(first ? first.value : "");
  }
  function moveActive(delta) {
    const list = flatOptions();
    if (list.length === 0) return;
    const current = activeOption();
    const index = current ? list.indexOf(current) : -1;
    const next = list[(index + delta + list.length) % list.length];
    activeValue.set(next.value);
    return next;
  }
  function choose(event, option) {
    select2(option);
    const dialog2 = (event.currentTarget ?? event.target)?.closest?.("dialog");
    if (dialog2?.open) dialog2.close();
  }
  function onKeydown(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        return;
      case "Enter": {
        const active = activeOption();
        if (!active) return;
        event.preventDefault();
        choose(event, active);
        return;
      }
      default:
    }
  }
  return {
    label,
    searchHtml,
    groups,
    query,
    visibleGroups,
    flatOptions,
    activeValue,
    activeOption,
    activeDescendant,
    dialogId,
    variant,
    optionId,
    isActive,
    select: select2,
    setQuery,
    moveActive,
    choose,
    onKeydown,
    raw
  };
}
function registerVariants15(registry3) {
  registry3.registerVariant("command-palette", "command-palette");
}
var template15 = new URL("./index.html", import.meta.url);
var styles15 = new URL("./styles.css", import.meta.url);
var commandPalette = { name: name15, root: root15, create: create15, registerVariants: registerVariants15, template: template15, styles: styles15 };

// ../../packages/components/src/datagrid/index.js
var name16 = "datagrid";
var root16 = "table";
function cellText(html) {
  return String(html ?? "").replace(/<[^>]*>/g, "").trim();
}
function create16(props) {
  if (!Array.isArray(props.columns)) throw new TypeError("datagrid: columns is required");
  if (!Array.isArray(props.rows)) throw new TypeError("datagrid: rows is required");
  const columns = signal(props.columns.map((column) => ({
    ...column,
    sortHtml: column.sortHtml ?? column.label
  })));
  const rows = signal(props.rows);
  const caption = signal(props.caption ?? "");
  const selectable = signal(props.selectable ?? false);
  const selectAllHtml = signal(props.selectAllHtml ?? "");
  const selectedIds = signal(props.selectedIds ?? []);
  const variant = signal(props.variant ?? "datagrid");
  const hasCaption = computed(() => caption() !== "");
  const focusPos = signal({ r: 0, c: 0 });
  const colOffset = computed(() => selectable() ? 1 : 0);
  const viewColumns = computed(() => columns().map((column, i) => ({ ...column, c: i + colOffset() })));
  const viewRows = computed(() => rows().map((row, r) => ({
    ...row,
    id: row.id ?? String(r),
    r: r + 1,
    cells: row.cells.map((html, i) => ({ html, r: r + 1, c: i + colOffset() }))
  })));
  const selectAllState = computed(() => {
    const total = rows().length;
    const count = selectedIds().length;
    if (total > 0 && count === total) return "all";
    if (count > 0) return "some";
    return "none";
  });
  function isRowSelected(row) {
    return selectedIds().includes(row.id) ? "true" : "false";
  }
  function toggleRow(id, checked) {
    const next = checked ? [.../* @__PURE__ */ new Set([...selectedIds(), id])] : selectedIds().filter((item) => item !== id);
    selectedIds.set(next);
    props.onSelectionChange?.(next);
  }
  function toggleAll(checked) {
    const next = checked ? viewRows().map((row) => row.id) : [];
    selectedIds.set(next);
    props.onSelectionChange?.(next);
  }
  function select2(ids) {
    selectedIds.set([...ids]);
  }
  function sortBy(column) {
    const dir = column.sort === "ascending" ? "desc" : "asc";
    columns.set(columns().map((item) => item.key === column.key ? { ...item, sort: dir === "asc" ? "ascending" : "descending" } : { ...item, sort: void 0 }));
    if (props.onSort) {
      props.onSort({ key: column.key, dir });
      return;
    }
    const index = columns().findIndex((item) => item.key === column.key);
    const collator = new Intl.Collator(void 0, { numeric: true, sensitivity: "base" });
    const sign = dir === "asc" ? 1 : -1;
    rows.set(rows().map((row, i) => ({ row, i, text: cellText(row.cells[index]) })).sort((a, b) => collator.compare(a.text, b.text) * sign || a.i - b.i).map((entry) => entry.row));
  }
  function sortClick(event, column) {
    if (!event.target?.closest?.("button")) return;
    sortBy(column);
  }
  function sortState() {
    const sorted = columns().find((column) => column.sort);
    return sorted ? { key: sorted.key, dir: sorted.sort === "ascending" ? "asc" : "desc" } : null;
  }
  function cellTabIndex(cell) {
    const focus = focusPos();
    return focus.r === cell.r && focus.c === cell.c ? 0 : -1;
  }
  function headerTabIndex(column) {
    const focus = focusPos();
    return focus.r === 0 && focus.c === column.c ? 0 : -1;
  }
  function selectAllTabIndex() {
    const focus = focusPos();
    return focus.r === 0 && focus.c === 0 ? 0 : -1;
  }
  function selectionTabIndex(row) {
    const focus = focusPos();
    return focus.r === row.r && focus.c === 0 ? 0 : -1;
  }
  function onKeydown(event) {
    const cell = event.target?.closest?.("th, td");
    if (!cell) return;
    const table2 = cell.closest("table");
    if (!table2) return;
    if (event.target !== cell && !event.target?.closest?.("button, input, select, textarea, a")) return;
    if (cell.hasAttribute("contenteditable") && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;
    const rowEls = [...table2.querySelectorAll("tr")];
    const r = rowEls.indexOf(cell.parentElement);
    const cellEls = [...cell.parentElement.children].filter((el) => el.matches("th, td"));
    const c = cellEls.indexOf(cell);
    if (r < 0 || c < 0) return;
    const lastRow = rowEls.length - 1;
    const lastCol = (row) => [...rowEls[row].children].filter((el) => el.matches("th, td")).length - 1;
    let next;
    switch (event.key) {
      case "ArrowRight":
        next = { r, c: c + 1 };
        break;
      case "ArrowLeft":
        next = { r, c: c - 1 };
        break;
      case "ArrowDown":
        next = { r: r + 1, c };
        break;
      case "ArrowUp":
        next = { r: r - 1, c };
        break;
      case "Home":
        next = event.ctrlKey ? { r: 0, c: 0 } : { r, c: 0 };
        break;
      case "End":
        next = event.ctrlKey ? { r: lastRow, c: lastCol(lastRow) } : { r, c: lastCol(r) };
        break;
      default:
        return;
    }
    if (next.r < 0 || next.r > lastRow || next.c < 0 || next.c > lastCol(next.r)) return;
    event.preventDefault();
    focusPos.set(next);
    const targetRow = rowEls[next.r];
    const target = [...targetRow.children].filter((el) => el.matches("th, td"))[next.c];
    target?.focus();
  }
  return {
    columns,
    rows,
    caption,
    selectable,
    selectAllHtml,
    selectedIds,
    variant,
    hasCaption,
    viewColumns,
    viewRows,
    selectAllState,
    isRowSelected,
    toggleRow,
    toggleAll,
    select: select2,
    sortBy,
    sortClick,
    sortState,
    focusPos,
    cellTabIndex,
    headerTabIndex,
    selectAllTabIndex,
    selectionTabIndex,
    onKeydown,
    raw
  };
}
function registerVariants16(registry3) {
  registry3.registerVariant("datagrid", "datagrid");
}
var template16 = new URL("./index.html", import.meta.url);
var styles16 = new URL("./styles.css", import.meta.url);
var datagrid = { name: name16, root: root16, create: create16, registerVariants: registerVariants16, template: template16, styles: styles16 };

// ../../packages/components/src/internal/dialog.js
function createDialogBehavior(props) {
  const idAttr = () => props.id ?? false;
  function resolveDialog(from) {
    if (from && typeof from === "object" && "closest" in from && typeof from.closest === "function") {
      return from.closest("dialog");
    }
    if (from && typeof from === "object" && "currentTarget" in from) {
      return from.currentTarget?.closest?.("dialog") ?? null;
    }
    if (props.id && typeof document !== "undefined") return document.getElementById(props.id);
    return null;
  }
  function show(from) {
    const dialog2 = resolveDialog(from);
    if (!dialog2 || dialog2.open) return;
    dialog2.showModal();
    props.onChange?.(true);
  }
  function close(from) {
    const dialog2 = resolveDialog(from);
    if (!dialog2 || !dialog2.open) return;
    dialog2.close();
    props.onChange?.(false);
  }
  function isOpen(from) {
    return Boolean(resolveDialog(from)?.open);
  }
  function onBackdropClick(event) {
    if (event.target === event.currentTarget) close(event);
  }
  function onClick(event) {
    if (event.target === event.currentTarget) {
      close(event);
      return;
    }
    const button2 = event.target?.closest?.("button");
    if (!button2) return;
    const header = event.currentTarget?.querySelector?.("header");
    if (header?.contains(button2)) close(event);
  }
  function onKeydown(event) {
    if (event.key !== "Escape") return;
    const dialog2 = resolveDialog(event);
    if (!dialog2?.open) return;
    event.preventDefault();
    close(event);
  }
  return { idAttr, show, close, isOpen, onBackdropClick, onClick, onKeydown };
}

// ../../packages/components/src/dialog/index.js
var name17 = "dialog";
var root17 = "dialog";
function create17(props) {
  if (!props.title) throw new TypeError("dialog: title is required");
  const title = signal(props.title);
  const body = signal(props.body ?? "");
  const variant = signal(props.variant ?? "default");
  const closeHtml = signal(props.closeHtml ?? "");
  const footerHtml = signal(props.footerHtml ?? "");
  const behavior = createDialogBehavior(props);
  return {
    title,
    body,
    variant,
    closeHtml,
    footerHtml,
    raw,
    idAttr: behavior.idAttr,
    show: behavior.show,
    close: behavior.close,
    isOpen: behavior.isOpen,
    onBackdropClick: behavior.onBackdropClick,
    onClick: behavior.onClick,
    onKeydown: behavior.onKeydown
  };
}
function registerVariants17(registry3) {
  registry3.registerVariant("dialog", "default");
  registry3.registerVariant("dialog", "destructive");
}
var template17 = new URL("./index.html", import.meta.url);
var styles17 = new URL("./styles.css", import.meta.url);
var dialog = { name: name17, root: root17, create: create17, registerVariants: registerVariants17, template: template17, styles: styles17 };

// ../../packages/components/src/drawer/index.js
var name18 = "drawer";
var root18 = "dialog";
function create18(props) {
  if (!props.title) throw new TypeError("drawer: title is required");
  const title = signal(props.title);
  const body = signal(props.body ?? "");
  const closeHtml = signal(props.closeHtml ?? "");
  const footerHtml = signal(props.footerHtml ?? "");
  const variant = signal(props.variant ?? "drawer");
  const hasFooter = computed(() => footerHtml() !== "");
  const behavior = createDialogBehavior(props);
  return {
    title,
    body,
    closeHtml,
    footerHtml,
    variant,
    hasFooter,
    raw,
    idAttr: behavior.idAttr,
    show: behavior.show,
    close: behavior.close,
    isOpen: behavior.isOpen,
    onBackdropClick: behavior.onBackdropClick,
    onClick: behavior.onClick,
    onKeydown: behavior.onKeydown
  };
}
function registerVariants18(registry3) {
  registry3.registerVariant("drawer", "drawer");
}
var template18 = new URL("./index.html", import.meta.url);
var styles18 = new URL("./styles.css", import.meta.url);
var drawer = { name: name18, root: root18, create: create18, registerVariants: registerVariants18, template: template18, styles: styles18 };

// ../../packages/components/src/dropdown-menu/index.js
var name19 = "dropdown-menu";
var root19 = "menu";
function create19(props) {
  if (!Array.isArray(props.items)) throw new TypeError("dropdown-menu: items is required");
  const items = signal(props.items);
  const label = signal(props.label ?? "");
  const variant = signal(props.variant ?? "default");
  function isDisabled(item) {
    return item.disabled ? "true" : "false";
  }
  function activate(item) {
    if (item.disabled || item.separator) return;
    props.onSelect?.(item.action ?? "", item);
  }
  function onKeydown(event) {
    const target = event.currentTarget ?? event.target;
    const menu = target?.closest?.("menu");
    if (!menu) return;
    const list = [...menu.querySelectorAll('[role="menuitem"]')];
    const index = list.indexOf(target);
    if (index < 0) return;
    let next;
    switch (event.key) {
      case "ArrowDown":
        next = list[(index + 1) % list.length];
        break;
      case "ArrowUp":
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
    event.preventDefault();
    next?.focus();
  }
  return { items, label, variant, isDisabled, activate, onKeydown };
}
function registerVariants19(registry3) {
  registry3.registerVariant("dropdown-menu", "default");
}
var template19 = new URL("./index.html", import.meta.url);
var styles19 = new URL("./styles.css", import.meta.url);
var dropdownMenu = { name: name19, root: root19, create: create19, registerVariants: registerVariants19, template: template19, styles: styles19 };

// ../../packages/components/src/empty-state/index.js
var name20 = "empty-state";
var root20 = "article";
function create20(props) {
  if (!props.title) throw new TypeError("empty-state: title is required");
  const title = signal(props.title);
  const body = signal(props.body ?? "");
  const mediaHtml = signal(props.mediaHtml ?? "");
  const actionHtml = signal(props.actionHtml ?? "");
  const variant = signal(props.variant ?? "empty-state");
  const hasMedia = computed(() => mediaHtml() !== "");
  const hasBody = computed(() => body() !== "");
  const hasAction = computed(() => actionHtml() !== "");
  return { title, body, mediaHtml, actionHtml, variant, hasMedia, hasBody, hasAction, raw };
}
function registerVariants20(registry3) {
  registry3.registerVariant("empty-state", "empty-state");
}
var template20 = new URL("./index.html", import.meta.url);
var styles20 = new URL("./styles.css", import.meta.url);
var emptyState = { name: name20, root: root20, create: create20, registerVariants: registerVariants20, template: template20, styles: styles20 };

// ../../packages/components/src/field/index.js
var name21 = "field";
var root21 = "p";
function create21(props) {
  if (!props.label) throw new TypeError("field: label is required");
  if (!props.controlId) throw new TypeError("field: controlId is required");
  const label = signal(props.label);
  const controlId = signal(props.controlId);
  const controlHtml = signal(props.controlHtml ?? "");
  const variant = signal(props.variant ?? "default");
  const hint = signal(props.hint ?? "");
  const error = signal(props.error ?? "");
  const hasError = computed(() => error() !== "");
  const showHint = computed(() => !hasError() && hint() !== "");
  return { label, controlId, controlHtml, variant, hint, error, hasError, showHint, raw };
}
function registerVariants21(registry3) {
  registry3.registerVariant("field", "default");
}
var template21 = new URL("./index.html", import.meta.url);
var styles21 = new URL("./styles.css", import.meta.url);
var field = { name: name21, root: root21, create: create21, registerVariants: registerVariants21, template: template21, styles: styles21 };

// ../../packages/components/src/form/index.js
var name22 = "form";
var root22 = "form";
function create22(props) {
  if (!props.fieldsHtml) throw new TypeError("form: fieldsHtml is required \u2014 render the fields into it");
  const formName = signal(props.name ?? "");
  const heading = signal(props.heading ?? "");
  const fieldsHtml = signal(props.fieldsHtml);
  const summaryHtml = signal(props.summaryHtml ?? "");
  const actionsHtml = signal(props.actionsHtml ?? "");
  const variant = signal(props.variant ?? "default");
  const submitted = signal(false);
  const hasHeading = computed(() => heading() !== "");
  const hasSummary = computed(() => summaryHtml() !== "");
  const hasActions = computed(() => actionsHtml() !== "");
  function submit(event) {
    event?.preventDefault?.();
    submitted.set(true);
    props.onSubmit?.({ name: formName() });
  }
  return { formName, heading, fieldsHtml, summaryHtml, actionsHtml, variant, submitted, hasHeading, hasSummary, hasActions, submit, raw };
}
function registerVariants22(registry3) {
  registry3.registerVariant("form", "default");
}
var template22 = new URL("./index.html", import.meta.url);
var styles22 = new URL("./styles.css", import.meta.url);
var form = { name: name22, root: root22, create: create22, registerVariants: registerVariants22, template: template22, styles: styles22 };

// ../../packages/components/src/hero/index.js
var name23 = "hero";
var root23 = "figure";
function create23(props) {
  if (!props.title && !props.titleHtml) {
    throw new TypeError("hero: title (or titleHtml) is required");
  }
  const variant = signal(props.variant ?? "stacked");
  const eyebrow = signal(props.eyebrow ?? "");
  const title = signal(props.title ?? "");
  const titleHtml = signal(props.titleHtml ?? "");
  const lede = signal(props.lede ?? "");
  const ledeHtml = signal(props.ledeHtml ?? "");
  const mediaSrc = signal(props.mediaSrc ?? "");
  const mediaAlt = signal(props.mediaAlt ?? "");
  const mediaHtml = signal(props.mediaHtml ?? "");
  const actionsHtml = signal(props.actionsHtml ?? "");
  const afterHtml = signal(props.afterHtml ?? "");
  const actionsLabel = signal(props.actionsLabel ?? "Primary");
  const hasMedia = computed(() => mediaHtml() !== "" || mediaSrc() !== "");
  const hasEyebrow = computed(() => eyebrow() !== "");
  const hasLede = computed(() => ledeHtml() !== "" || lede() !== "");
  const hasActions = computed(() => actionsHtml() !== "");
  const hasAfter = computed(() => afterHtml() !== "");
  const isH2 = computed(() => props.headingLevel === "h2");
  return {
    variant,
    eyebrow,
    title,
    titleHtml,
    lede,
    ledeHtml,
    mediaSrc,
    mediaAlt,
    mediaHtml,
    actionsHtml,
    actionsLabel,
    afterHtml,
    hasMedia,
    hasEyebrow,
    hasLede,
    hasActions,
    hasAfter,
    isH2,
    raw
  };
}
function registerVariants23(registry3) {
  registry3.registerVariant("hero", "stacked");
  registry3.registerVariant("hero", "overlay");
  registry3.registerVariant("hero", "split");
}
var template23 = new URL("./index.html", import.meta.url);
var styles23 = new URL("./styles.css", import.meta.url);
var hero = { name: name23, root: root23, create: create23, registerVariants: registerVariants23, template: template23, styles: styles23 };

// ../../packages/components/src/input/index.js
var name24 = "input";
var root24 = "input";
function create24(props = {}) {
  const value = signal(props.value ?? "");
  const controlId = signal(props.id ?? "");
  const variant = signal(props.variant ?? "default");
  const type = signal(props.type ?? "text");
  const disabled = signal(props.disabled ?? false);
  const isInvalid = signal(props.invalid ?? false);
  function update(event) {
    value.set(event.target.value);
  }
  return { value, controlId, variant, type, disabled, isInvalid, update };
}
function registerVariants24(registry3) {
  registry3.registerVariant("input", "default");
}
var template24 = new URL("./index.html", import.meta.url);
var styles24 = new URL("./styles.css", import.meta.url);
var input = { name: name24, root: root24, create: create24, registerVariants: registerVariants24, template: template24, styles: styles24 };

// ../../packages/components/src/list-group/index.js
var name25 = "list-group";
var root25 = "ul";
function create25(props) {
  if (!Array.isArray(props.items)) throw new TypeError("list-group: items is required");
  const items = signal(props.items);
  const variant = signal(props.variant ?? "default");
  return { items, variant, raw };
}
function registerVariants25(registry3) {
  registry3.registerVariant("list-group", "default");
}
var template25 = new URL("./index.html", import.meta.url);
var styles25 = new URL("./styles.css", import.meta.url);
var listGroup = { name: name25, root: root25, create: create25, registerVariants: registerVariants25, template: template25, styles: styles25 };

// ../../packages/components/src/multiselect/index.js
var name26 = "multiselect";
var root26 = "section";
function create26(props) {
  if (!props.id) throw new TypeError("multiselect: id is required");
  if (!props.inputHtml) throw new TypeError("multiselect: inputHtml is required (render the input component)");
  const label = signal(props.label ?? "");
  const inputHtml = signal(props.inputHtml);
  const options = signal(props.options ?? []);
  const query = signal("");
  const selected = signal(props.selected ?? []);
  const open = signal(props.open ?? false);
  const activeValue = signal("");
  const variant = signal(props.variant ?? "multiselect");
  let suppressOpen = false;
  const listboxId = computed(() => `${props.id}-listbox`);
  const optionId = (option) => `${props.id}-option-${option.value}`;
  const hasSelected = computed(() => selected().length > 0);
  const visibleOptions = computed(() => {
    const q = query().trim().toLowerCase();
    if (q === "") return options();
    return options().filter((option) => option.label.toLowerCase().includes(q));
  });
  const activeOption = computed(() => visibleOptions().find((option) => option.value === activeValue()) ?? null);
  const activeDescendant = computed(() => {
    const active = activeOption();
    return open() && active ? optionId(active) : "";
  });
  const isSelected = (option) => selected().some((item) => item.value === option.value) ? "true" : "false";
  const isActive = (option) => option.value === activeValue() ? "true" : "false";
  const toggle2 = (option) => {
    const current = selected();
    const next = current.some((item) => item.value === option.value) ? current.filter((item) => item.value !== option.value) : [...current, { value: option.value, label: option.label, dismissHtml: option.dismissHtml ?? "" }];
    selected.set(next);
    props.onChange?.({ values: next.map((item) => item.value) });
  };
  const addValue = (value) => {
    const option = options().find((item) => item.value === value);
    if (!option || selected().some((item) => item.value === value)) return false;
    selected.set([...selected(), { value: option.value, label: option.label, dismissHtml: "" }]);
    return true;
  };
  const removeValue = (value) => {
    if (!selected().some((item) => item.value === value)) return false;
    selected.set(selected().filter((item) => item.value !== value));
    props.onChange?.({ values: selected().map((item) => item.value) });
    return true;
  };
  const removeLast = () => {
    const last = selected().at(-1);
    return last ? removeValue(last.value) : false;
  };
  function onInput(event) {
    query.set(event.target?.value ?? "");
    if (!open()) open.set(true);
    const first = visibleOptions()[0];
    activeValue.set(first ? first.value : "");
  }
  function onFocus() {
    if (suppressOpen) {
      suppressOpen = false;
      return;
    }
    query.set("");
    if (!open()) open.set(true);
  }
  function onChipsClick(event) {
    const button2 = event.target?.closest?.("button");
    if (!button2) return;
    const li = button2.closest?.("li");
    const list = (event.currentTarget ?? event.target)?.closest?.("ul");
    if (!li || !list) return;
    const index = [...list.children].indexOf(li);
    const item = selected()[index];
    if (!item) return;
    const input2 = list.closest?.("section")?.querySelector?.("input");
    toggle2(item);
    if (input2) {
      suppressOpen = true;
      input2.focus();
    }
  }
  function moveActive(delta) {
    const list = visibleOptions();
    if (list.length === 0) return;
    const index = list.findIndex((option) => option.value === activeValue());
    activeValue.set(list[(index + delta + list.length) % list.length].value);
  }
  function onKeydown(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open()) open.set(true);
        else moveActive(1);
        if (open() && !activeOption() && visibleOptions().length > 0) activeValue.set(visibleOptions()[0].value);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open()) open.set(true);
        else moveActive(-1);
        if (open() && !activeOption() && visibleOptions().length > 0) activeValue.set(visibleOptions()[visibleOptions().length - 1].value);
        return;
      case "Home":
        if (!open() || visibleOptions().length === 0) return;
        event.preventDefault();
        activeValue.set(visibleOptions()[0].value);
        return;
      case "End":
        if (!open() || visibleOptions().length === 0) return;
        event.preventDefault();
        activeValue.set(visibleOptions()[visibleOptions().length - 1].value);
        return;
      case "Enter": {
        const active = activeOption();
        if (open() && active) {
          event.preventDefault();
          toggle2(active);
        }
        return;
      }
      case "Escape":
        if (open()) {
          event.preventDefault();
          open.set(false);
        }
        return;
      default:
    }
  }
  return {
    label,
    inputHtml,
    options,
    query,
    visibleOptions,
    selected,
    open,
    activeValue,
    activeOption,
    activeDescendant,
    variant,
    listboxId,
    optionId,
    hasSelected,
    isSelected,
    isActive,
    toggle: toggle2,
    addValue,
    removeValue,
    removeLast,
    moveActive,
    onKeydown,
    onInput,
    onFocus,
    onChipsClick,
    raw
  };
}
function registerVariants26(registry3) {
  registry3.registerVariant("multiselect", "multiselect");
}
var template26 = new URL("./index.html", import.meta.url);
var styles26 = new URL("./styles.css", import.meta.url);
var multiselect = { name: name26, root: root26, create: create26, registerVariants: registerVariants26, template: template26, styles: styles26 };

// ../../packages/components/src/pagination/index.js
var name27 = "pagination";
var root27 = "nav";
function create27(props) {
  if (!props.pages || props.pages < 1) throw new TypeError("pagination: pages is required");
  const page = signal(props.page ?? 1);
  const pages = signal(props.pages);
  const label = signal(props.label ?? "Pagination");
  const variant = signal(props.variant ?? "pagination");
  const hrefFor = props.hrefFor ?? ((n) => `#page-${n}`);
  const items = computed(() => {
    const total = pages();
    const current = page();
    const numbers = /* @__PURE__ */ new Set([1, total, current - 1, current, current + 1]);
    const list = [{
      label: props.prevLabel ?? "Previous",
      page: current > 1 ? current - 1 : null,
      current: false,
      href: current > 1 ? hrefFor(current - 1) : ""
    }];
    let elided = false;
    for (let n = 1; n <= total; n += 1) {
      if (!numbers.has(n)) {
        if (!elided) {
          list.push({ label: "\u2026", page: null, current: false, href: "" });
          elided = true;
        }
        continue;
      }
      elided = false;
      list.push({
        label: String(n),
        page: n === current ? null : n,
        current: n === current,
        href: n === current ? "" : hrefFor(n)
      });
    }
    list.push({
      label: props.nextLabel ?? "Next",
      page: current < total ? current + 1 : null,
      current: false,
      href: current < total ? hrefFor(current + 1) : ""
    });
    return list;
  });
  return { items, label, variant };
}
function registerVariants27(registry3) {
  registry3.registerVariant("pagination", "pagination");
}
var template27 = new URL("./index.html", import.meta.url);
var styles27 = new URL("./styles.css", import.meta.url);
var pagination = { name: name27, root: root27, create: create27, registerVariants: registerVariants27, template: template27, styles: styles27 };

// ../../packages/components/src/pipeline/index.js
var name28 = "pipeline";
var root28 = "ol";
function create28(props) {
  if (!Array.isArray(props.columns)) throw new TypeError("pipeline: columns is required");
  const columns = signal(props.columns);
  const variant = signal(props.variant ?? "pipeline");
  function moveCard(fromColumn, fromIndex, toColumn, toIndex) {
    const cols = columns().map((column) => ({ ...column, cardsHtml: [...column.cardsHtml] }));
    const source = cols[fromColumn];
    const target = cols[toColumn];
    if (!source || !target || fromIndex < 0 || fromIndex >= source.cardsHtml.length) return false;
    const [card2] = source.cardsHtml.splice(fromIndex, 1);
    const clamped = Math.max(0, Math.min(toIndex, target.cardsHtml.length));
    target.cardsHtml.splice(clamped, 0, card2);
    columns.set(cols);
    props.onCardMove?.({ fromColumn, fromIndex, toColumn, toIndex: clamped });
    return true;
  }
  return { columns, variant, moveCard, raw };
}
function registerVariants28(registry3) {
  registry3.registerVariant("pipeline", "pipeline");
}
var template28 = new URL("./index.html", import.meta.url);
var styles28 = new URL("./styles.css", import.meta.url);
var pipeline = { name: name28, root: root28, create: create28, registerVariants: registerVariants28, template: template28, styles: styles28 };

// ../../packages/components/src/progress/index.js
var name29 = "progress";
var root29 = "progress";
function create29(props = {}) {
  const value = signal(props.value ?? null);
  const max = signal(props.max ?? 100);
  const variant = signal(props.variant ?? "default");
  const isIndeterminate = computed(() => value() === null);
  return { value, max, variant, isIndeterminate };
}
function registerVariants29(registry3) {
  registry3.registerVariant("progress", "default");
}
var template29 = new URL("./index.html", import.meta.url);
var styles29 = new URL("./styles.css", import.meta.url);
var progress = { name: name29, root: root29, create: create29, registerVariants: registerVariants29, template: template29, styles: styles29 };

// ../../packages/components/src/radio/index.js
var name30 = "radio";
var root30 = "fieldset";
function create30(props) {
  if (!props.legend) throw new TypeError("radio: legend is required");
  if (!props.name) throw new TypeError("radio: name is required");
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError("radio: options must be a non-empty array");
  }
  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const options = signal(props.options);
  const variant = signal(props.variant ?? "default");
  const value = signal(props.value ?? props.options[0].value);
  function isChecked(option) {
    return option.value === value();
  }
  function choose(option) {
    value.set(option.value);
    props.onChoose?.(option.value);
  }
  return { legend, groupName, options, variant, value, isChecked, choose };
}
function registerVariants30(registry3) {
  registry3.registerVariant("radio", "default");
}
var template30 = new URL("./index.html", import.meta.url);
var styles30 = new URL("./styles.css", import.meta.url);
var radio = { name: name30, root: root30, create: create30, registerVariants: registerVariants30, template: template30, styles: styles30 };

// ../../packages/components/src/rating/index.js
var name31 = "rating";
var root31 = "fieldset";
function create31(props) {
  if (!props.legend) throw new TypeError("rating: legend is required");
  if (!props.name) throw new TypeError("rating: name is required");
  if (!props.starHtml) throw new TypeError("rating: starHtml is required \u2014 render the star mark into it");
  const max = props.max ?? 5;
  if (!Number.isInteger(max) || max < 1 || max > 5) {
    throw new TypeError("rating: max must be an integer from one to five \u2014 the range rules are authored for five steps");
  }
  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const starHtml = signal(props.starHtml);
  const variant = signal(props.variant ?? "rating");
  const inputVariant = signal("default");
  const options = signal(
    Array.from({ length: max }, (_, index) => {
      const value = index + 1;
      return { value: String(value), numeric: value, label: value + (value === 1 ? " star" : " stars") };
    })
  );
  const selected = signal(props.value !== void 0 ? String(props.value) : "");
  function isChecked(option) {
    return option.value === selected();
  }
  function change(option) {
    if (option.value === selected()) return;
    selected.set(option.value);
    props.onChange?.({
      name: groupName(),
      mode: "rating",
      values: [option.numeric],
      changed: option.numeric,
      selected: true
    });
  }
  return { legend, groupName, starHtml, variant, inputVariant, options, selected, isChecked, change, raw };
}
function registerVariants31(registry3) {
  registry3.registerVariant("rating", "rating");
}
var template31 = new URL("./index.html", import.meta.url);
var styles31 = new URL("./styles.css", import.meta.url);
var rating = { name: name31, root: root31, create: create31, registerVariants: registerVariants31, template: template31, styles: styles31 };

// ../../packages/components/src/search-field/index.js
var name32 = "search-field";
var root32 = "search";
function create32(props) {
  if (!props.label) throw new TypeError("search-field: label is required");
  if (!props.controlId) throw new TypeError("search-field: controlId is required");
  const label = signal(props.label);
  const controlId = signal(props.controlId);
  const groupName = signal(props.name ?? "");
  const value = signal(props.value ?? "");
  const clearLabel = signal(props.clearLabel ?? "Clear");
  const submitHtml = signal(props.submitHtml ?? "");
  const inputVariant = signal("default");
  const variant = signal(props.variant ?? "default");
  const hasValue = computed(() => value() !== "");
  const hasSubmit = computed(() => submitHtml() !== "");
  function update(event) {
    value.set(event.target.value);
  }
  function clear() {
    if (value() === "") return;
    value.set("");
    props.onClear?.({ name: groupName() });
  }
  function submit() {
    props.onSearch?.({ name: groupName(), value: value() });
  }
  function keydown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault?.();
    submit();
  }
  return { label, controlId, groupName, value, clearLabel, submitHtml, inputVariant, variant, hasValue, hasSubmit, update, clear, submit, keydown, raw };
}
function registerVariants32(registry3) {
  registry3.registerVariant("search-field", "default");
}
var template32 = new URL("./index.html", import.meta.url);
var styles32 = new URL("./styles.css", import.meta.url);
var searchField = { name: name32, root: root32, create: create32, registerVariants: registerVariants32, template: template32, styles: styles32 };

// ../../packages/components/src/segmented-control/index.js
var name33 = "segmented-control";
var root33 = "fieldset";
function create33(props) {
  if (!props.legend) throw new TypeError("segmented-control: legend is required");
  if (!props.name) throw new TypeError("segmented-control: name is required");
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError("segmented-control: options must be a non-empty array");
  }
  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const options = signal(props.options);
  const variant = signal(props.variant ?? "segmented-control");
  const inputVariant = signal("default");
  const selected = signal(props.value ?? props.options[0].value);
  function isChecked(option) {
    return option.value === selected();
  }
  function change(option) {
    if (option.value === selected()) return;
    selected.set(option.value);
    props.onChange?.({
      name: groupName(),
      mode: "segmented",
      values: [option.value],
      changed: option.value,
      selected: true
    });
  }
  return { legend, groupName, options, variant, inputVariant, selected, isChecked, change };
}
function registerVariants33(registry3) {
  registry3.registerVariant("segmented-control", "segmented-control");
}
var template33 = new URL("./index.html", import.meta.url);
var styles33 = new URL("./styles.css", import.meta.url);
var segmentedControl = { name: name33, root: root33, create: create33, registerVariants: registerVariants33, template: template33, styles: styles33 };

// ../../packages/components/src/select/index.js
var name34 = "select";
var root34 = "section";
function create34(props) {
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError("select: options must be a non-empty array");
  }
  const options = signal(props.options);
  const value = signal(props.value ?? props.options[0].value);
  const open = signal(props.open ?? false);
  const controlId = signal(props.id ?? "");
  const fieldName = signal(props.name ?? "");
  const label = signal(props.label ?? "");
  const variant = signal(props.variant ?? "select");
  const disabled = signal(props.disabled ?? false);
  function isNative() {
    return variant() === "native";
  }
  function isPopover() {
    return variant() !== "native";
  }
  function isSelected(option) {
    return option.value === value();
  }
  function selectedAttr(option) {
    return isSelected(option) ? "true" : "false";
  }
  function selectedLabel() {
    return options().find((option) => option.value === value())?.label ?? "";
  }
  function listboxId() {
    return controlId() === "" ? "" : `${controlId()}-listbox`;
  }
  function optionId(option) {
    return controlId() === "" ? "" : `${controlId()}-option-${option.value}`;
  }
  function expandedAttr() {
    return open() ? "true" : "false";
  }
  function toggle2() {
    open.set(!open());
  }
  function close() {
    open.set(false);
  }
  function choose(option) {
    value.set(option.value);
    open.set(false);
    props.onChoose?.(option.value);
  }
  function chooseNative(event) {
    const option = options().find((entry) => entry.value === event.target.value);
    if (option) choose(option);
  }
  function keydown(event) {
    if (event.key === "Escape") {
      open.set(false);
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open()) {
      event.preventDefault?.();
      open.set(true);
    }
  }
  return {
    options,
    value,
    open,
    controlId,
    fieldName,
    label,
    variant,
    disabled,
    isNative,
    isPopover,
    isSelected,
    selectedAttr,
    selectedLabel,
    listboxId,
    optionId,
    expandedAttr,
    toggle: toggle2,
    close,
    choose,
    chooseNative,
    keydown
  };
}
function registerVariants34(registry3) {
  registry3.registerVariant("select", "select");
  registry3.registerVariant("select", "native");
}
var template34 = new URL("./index.html", import.meta.url);
var styles34 = new URL("./styles.css", import.meta.url);
var select = { name: name34, root: root34, create: create34, registerVariants: registerVariants34, template: template34, styles: styles34 };

// ../../packages/components/src/sidebar/index.js
var name35 = "sidebar";
var root35 = "aside";
function create35(props) {
  if (!Array.isArray(props.sections) || props.sections.length === 0) {
    throw new TypeError("sidebar: sections is required");
  }
  const sections = signal(
    props.sections.map((section) => ({
      label: section.label ?? "",
      items: (section.items ?? []).map((item) => ({
        ...item,
        href: item.href ?? "",
        value: item.value ?? "",
        iconHtml: item.iconHtml ?? "",
        isLink: Boolean(item.href),
        pressed: item.pressed === true || item.pressed === "true" ? "true" : "false",
        ariaCurrent: item.current ? "page" : false
      }))
    }))
  );
  const label = signal(props.label ?? "Sidebar");
  const variant = signal(props.variant ?? "sidebar");
  return { sections, label, variant, raw };
}
function registerVariants35(registry3) {
  registry3.registerVariant("sidebar", "sidebar");
  registry3.registerVariant("sidebar", "subnav");
  registry3.registerVariant("sidebar", "chips");
}
var template35 = new URL("./index.html", import.meta.url);
var styles35 = new URL("./styles.css", import.meta.url);
var sidebar = { name: name35, root: root35, create: create35, registerVariants: registerVariants35, template: template35, styles: styles35 };

// ../../packages/components/src/site-footer/index.js
var name36 = "site-footer";
var root36 = "footer";
function create36(props) {
  if (!Array.isArray(props.groups) || props.groups.length === 0) {
    throw new TypeError("site-footer: groups is required");
  }
  const groups = signal(props.groups);
  const noteHtml = signal(props.noteHtml ?? "");
  const variant = signal(props.variant ?? "default");
  function groupLabel(group) {
    return group.ariaLabel ?? group.label ?? "Footer";
  }
  return { groups, noteHtml, variant, groupLabel, raw };
}
function registerVariants36(registry3) {
  registry3.registerVariant("site-footer", "default");
}
var template36 = new URL("./index.html", import.meta.url);
var styles36 = new URL("./styles.css", import.meta.url);
var siteFooter = { name: name36, root: root36, create: create36, registerVariants: registerVariants36, template: template36, styles: styles36 };

// ../../packages/components/src/stepper/index.js
var name37 = "stepper";
var root37 = "ol";
function create37(props) {
  if (!Array.isArray(props.steps) || props.steps.length === 0) {
    throw new TypeError("stepper: steps must be a non-empty array");
  }
  const stepperName = signal(props.name ?? "");
  const steps = signal(props.steps);
  const variant = signal(props.variant ?? "stepper");
  const currentValue = signal(props.current ?? props.steps[0].value);
  const currentIndex = computed(() => steps().findIndex((step) => step.value === currentValue()));
  function indexOf(step) {
    return steps().findIndex((candidate) => candidate.value === step.value);
  }
  function stateFor(step) {
    const index = indexOf(step);
    if (index < currentIndex()) return "complete";
    if (index === currentIndex()) return "current";
    return "upcoming";
  }
  function isCurrent(step) {
    return step.value === currentValue();
  }
  function stepNumber(step) {
    return String(indexOf(step) + 1);
  }
  function goTo(value) {
    const index = steps().findIndex((step) => step.value === value);
    if (index === -1 || value === currentValue()) return;
    currentValue.set(value);
    props.onStep?.({ name: stepperName(), index, value, label: steps()[index].label });
  }
  function next() {
    const target = steps()[currentIndex() + 1];
    if (target) goTo(target.value);
  }
  function previous() {
    const target = steps()[currentIndex() - 1];
    if (target) goTo(target.value);
  }
  return { stepperName, steps, variant, currentValue, currentIndex, stateFor, isCurrent, stepNumber, goTo, next, previous };
}
function registerVariants37(registry3) {
  registry3.registerVariant("stepper", "stepper");
}
var template37 = new URL("./index.html", import.meta.url);
var styles37 = new URL("./styles.css", import.meta.url);
var stepper = { name: name37, root: root37, create: create37, registerVariants: registerVariants37, template: template37, styles: styles37 };

// ../../packages/components/src/table/index.js
var name38 = "table";
var root38 = "table";
function create38(props) {
  if (!Array.isArray(props.columns)) throw new TypeError("table: columns is required");
  if (!Array.isArray(props.rows)) throw new TypeError("table: rows is required");
  const columns = signal(props.columns);
  const rows = signal(props.rows.map((row) => row.map((cell, i) => {
    const normalized = typeof cell === "string" ? { text: cell } : cell;
    if (normalized.header) return normalized;
    const label = props.columns[i];
    return typeof label === "string" && label !== "" ? { ...normalized, label } : normalized;
  })));
  const caption = signal(props.caption ?? "");
  const variant = signal(props.variant ?? "default");
  const hasCaption = computed(() => caption() !== "");
  return { columns, rows, caption, variant, hasCaption, raw };
}
function registerVariants38(registry3) {
  registry3.registerVariant("table", "default");
  registry3.registerVariant("table", "striped");
}
var template38 = new URL("./index.html", import.meta.url);
var styles38 = new URL("./styles.css", import.meta.url);
var table = { name: name38, root: root38, create: create38, registerVariants: registerVariants38, template: template38, styles: styles38 };

// ../../packages/components/src/tabs/index.js
var name39 = "tabs";
var root39 = "section";
function create39(props) {
  if (!props.id) throw new TypeError("tabs: id is required \u2014 it bases the tab and panel ids");
  if (!props.label) throw new TypeError("tabs: label is required");
  if (!Array.isArray(props.tabs) || props.tabs.length === 0) {
    throw new TypeError("tabs: tabs must be a non-empty array");
  }
  for (const tab of props.tabs) {
    if (!tab.panelHtml) throw new TypeError("tabs: every tab needs panelHtml \u2014 render its panel");
  }
  const idBase = signal(props.id);
  const label = signal(props.label);
  const groupName = signal(props.name ?? "");
  const tabs2 = signal(props.tabs);
  const variant = signal(props.variant ?? "tabs");
  const activation = signal(props.activation ?? "automatic");
  const firstEnabled = props.tabs.find((tab) => !tab.disabled);
  const selected = signal(
    props.tabs.some((tab) => tab.value === props.value && !tab.disabled) ? props.value ?? "" : firstEnabled?.value ?? props.tabs[0].value
  );
  const focused = signal(selected());
  function isSelected(tab) {
    return tab.value === selected();
  }
  function selectedAttr(tab) {
    return isSelected(tab) ? "true" : "false";
  }
  function tabIndex(tab) {
    return tab.value === focused() && !tab.disabled ? 0 : -1;
  }
  function tabId(tab) {
    return idBase() + "-tab-" + tab.value;
  }
  function panelId(tab) {
    return idBase() + "-panel-" + tab.value;
  }
  function select2(tab) {
    if (tab.disabled) return;
    focused.set(tab.value);
    if (tab.value === selected()) return;
    selected.set(tab.value);
    props.onSelect?.({
      name: groupName(),
      mode: "tabs",
      values: [tab.value],
      changed: tab.value,
      selected: true
    });
  }
  function onKeydown(event, tab) {
    const enabled = tabs2().filter((t) => !t.disabled);
    const index = enabled.findIndex((t) => t.value === tab.value);
    if (index < 0) return;
    let next;
    switch (event.key) {
      case "ArrowRight":
        next = enabled[(index + 1) % enabled.length];
        break;
      case "ArrowLeft":
        next = enabled[(index - 1 + enabled.length) % enabled.length];
        break;
      case "Home":
        next = enabled[0];
        break;
      case "End":
        next = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    focused.set(next.value);
    if (activation() === "automatic") select2(next);
    const doc = (event.currentTarget ?? event.target)?.ownerDocument;
    doc?.getElementById(tabId(next))?.focus();
  }
  return {
    idBase,
    label,
    groupName,
    tabs: tabs2,
    variant,
    activation,
    selected,
    focused,
    isSelected,
    selectedAttr,
    tabIndex,
    tabId,
    panelId,
    select: select2,
    onKeydown,
    raw
  };
}
function registerVariants39(registry3) {
  registry3.registerVariant("tabs", "tabs");
}
var template39 = new URL("./index.html", import.meta.url);
var styles39 = new URL("./styles.css", import.meta.url);
var tabs = { name: name39, root: root39, create: create39, registerVariants: registerVariants39, template: template39, styles: styles39 };

// ../../packages/components/src/textarea/index.js
var name40 = "textarea";
var root40 = "textarea";
function create40(props = {}) {
  const value = signal(props.value ?? "");
  const controlId = signal(props.id ?? "");
  const rows = signal(props.rows ?? 4);
  const placeholder = signal(props.placeholder ?? "");
  const variant = signal(props.variant ?? "default");
  const disabled = signal(props.disabled ?? false);
  const isInvalid = signal(props.invalid ?? false);
  function update(event) {
    value.set(event.target.value);
  }
  return { value, controlId, rows, placeholder, variant, disabled, isInvalid, update };
}
function registerVariants40(registry3) {
  registry3.registerVariant("textarea", "default");
}
var template40 = new URL("./index.html", import.meta.url);
var styles40 = new URL("./styles.css", import.meta.url);
var textarea = { name: name40, root: root40, create: create40, registerVariants: registerVariants40, template: template40, styles: styles40 };

// ../../packages/components/src/theme-toggle/index.js
var name41 = "theme-toggle";
var root41 = "fieldset";
var THEME_MODES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" }
];
function create41(props = {}) {
  const legend = signal(props.legend ?? "Theme");
  const groupName = signal(props.name ?? "theme");
  const mode = signal(props.value ?? "system");
  const options = signal(THEME_MODES);
  const variant = signal(props.variant ?? "theme-toggle");
  const inputVariant = signal("default");
  const isChecked = (option) => option.value === mode();
  const change = (option) => {
    const previousMode = mode();
    if (option.value === previousMode) return;
    mode.set(option.value);
    props.onThemeChange?.({ name: groupName(), mode: option.value, previousMode });
  };
  return { legend, groupName, mode, options, variant, inputVariant, isChecked, change };
}
function registerVariants41(registry3) {
  registry3.registerVariant("theme-toggle", "theme-toggle");
}
var template41 = new URL("./index.html", import.meta.url);
var styles41 = new URL("./styles.css", import.meta.url);
var themeToggle = { name: name41, root: root41, create: create41, registerVariants: registerVariants41, template: template41, styles: styles41 };

// ../../packages/components/src/ids.js
var counter = 0;
function nextId(prefix) {
  counter += 1;
  return `bn-${prefix}-${counter}`;
}

// ../../packages/components/src/toast/index.js
var name42 = "toast";
var root42 = "ol";
var ICON_PATHS = {
  success: '<circle cx="8" cy="8" r="6"/><path d="M5.5 8.2l1.8 1.8 3.4-3.8"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.4v3.4"/><path d="M8 5v.1"/>',
  warning: '<path d="M8 2.9l5.3 9.1H2.7z"/><path d="M8 6.5v2.7"/><path d="M8 11v.1"/>',
  danger: '<circle cx="8" cy="8" r="6"/><path d="M5.8 5.8l4.4 4.4"/><path d="M10.2 5.8l-4.4 4.4"/>'
};
function create42(props) {
  const items = signal(props.items ?? []);
  const live = signal(props.live ?? "polite");
  const variant = signal(props.variant ?? "default");
  const iconFor = (item) => {
    const inner = ICON_PATHS[item.tone ?? "info"] ?? ICON_PATHS.info;
    return '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  };
  const dismissItem = (item) => {
    items.set(items().filter((entry) => entry !== item));
  };
  function onItemClick(event, item) {
    if (event.target?.closest?.("button")) dismissItem(item);
  }
  return { items, live, variant, iconFor, dismissItem, onItemClick, raw };
}
function createToaster(options = {}) {
  const defaultDuration = options.duration ?? 5e3;
  const items = signal(
    /** @type {ToastItem[]} */
    []
  );
  const dismiss = (id) => {
    items.set(items().filter((item) => (
      /** @type {ToastItem & { id?: string }} */
      item.id !== id
    )));
  };
  const push = (item) => {
    const id = item.id ?? nextId("toast");
    items.set([...items(), { ...item, id, dismissHtml: item.dismissHtml ?? "" }]);
    const duration = item.duration ?? defaultDuration;
    if (duration > 0 && typeof setTimeout === "function") {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  };
  return { items, push, dismiss };
}
function registerVariants42(registry3) {
  registry3.registerVariant("toast", "default");
}
var template42 = new URL("./index.html", import.meta.url);
var styles42 = new URL("./styles.css", import.meta.url);
var toast = { name: name42, root: root42, create: create42, registerVariants: registerVariants42, template: template42, styles: styles42 };

// ../../packages/components/src/toggle/index.js
var name43 = "toggle";
var root43 = "input";
function create43(props) {
  if (!props.label) throw new TypeError("toggle: label is required");
  const label = signal(props.label);
  const variant = signal("switch");
  const checked = signal(props.checked ?? false);
  const disabled = signal(props.disabled ?? false);
  function toggle2(event) {
    checked.set(event.target.checked);
    props.onToggle?.(event.target.checked);
  }
  return { label, variant, checked, disabled, toggle: toggle2 };
}
function registerVariants43(registry3) {
  registry3.registerVariant("toggle", "switch");
}
var template43 = new URL("./index.html", import.meta.url);
var styles43 = new URL("./styles.css", import.meta.url);
var toggle = { name: name43, root: root43, create: create43, registerVariants: registerVariants43, template: template43, styles: styles43 };

// ../../packages/components/src/toolbar/index.js
var name44 = "toolbar";
var root44 = "section";
function create44(props) {
  if (!props.label) throw new TypeError("toolbar: label is required");
  if (!props.actionsHtml) throw new TypeError("toolbar: actionsHtml is required \u2014 render the primary actions into it");
  const label = signal(props.label);
  const actionsHtml = signal(props.actionsHtml);
  const overflowHtml = signal(props.overflowHtml ?? "");
  const overflowLabel = signal(props.overflowLabel ?? "More");
  const variant = signal(props.variant ?? "toolbar");
  const overflowOpen = signal(props.overflowOpen ?? false);
  const hasOverflow = computed(() => overflowHtml() !== "");
  function expandedAttr() {
    return overflowOpen() ? "true" : "false";
  }
  function toggleOverflow() {
    overflowOpen.set(!overflowOpen());
    props.onOverflow?.({ open: overflowOpen() });
  }
  function closeOverflow() {
    if (!overflowOpen()) return;
    overflowOpen.set(false);
    props.onOverflow?.({ open: false });
  }
  function onKeydown(event) {
    if (event.key !== "Escape" || !overflowOpen()) return;
    event.preventDefault();
    closeOverflow();
    const bar = (event.currentTarget ?? event.target)?.closest?.("section");
    bar?.querySelector?.("button[aria-expanded]")?.focus();
  }
  return { label, actionsHtml, overflowHtml, overflowLabel, variant, overflowOpen, hasOverflow, expandedAttr, toggleOverflow, closeOverflow, onKeydown, raw };
}
function registerVariants44(registry3) {
  registry3.registerVariant("toolbar", "toolbar");
}
var template44 = new URL("./index.html", import.meta.url);
var styles44 = new URL("./styles.css", import.meta.url);
var toolbar = { name: name44, root: root44, create: create44, registerVariants: registerVariants44, template: template44, styles: styles44 };

// ../../packages/components/src/tooltip/index.js
var name45 = "tooltip";
var root45 = "aside";
function create45(props) {
  if (!props.text) throw new TypeError("tooltip: text is required");
  if (!props.invokerHtml) throw new TypeError("tooltip: invokerHtml is required (render the invoker)");
  const text = signal(props.text);
  const invokerHtml = signal(props.invokerHtml);
  const variant = signal(props.variant ?? "default");
  return { text, invokerHtml, variant, raw };
}
function registerVariants45(registry3) {
  registry3.registerVariant("tooltip", "default");
}
var template45 = new URL("./index.html", import.meta.url);
var styles45 = new URL("./styles.css", import.meta.url);
var tooltip = { name: name45, root: root45, create: create45, registerVariants: registerVariants45, template: template45, styles: styles45 };

// ../../packages/components/src/tree/index.js
var name46 = "tree";
var root46 = "ul";
function create46(props) {
  if (!Array.isArray(props.items)) throw new TypeError("tree: items is required");
  const items = signal(props.items);
  const variant = signal(props.variant ?? "tree");
  const role = computed(() => variant());
  const idOf = (item) => item.id ?? item.label;
  const selectedId = signal(props.selectedId ?? null);
  const focusedId = signal(props.selectedId ?? (props.items[0] ? idOf(props.items[0]) : null));
  const expandedState = (item) => item.expanded ? "true" : "false";
  const selectedAttr = (item) => selectedId() === idOf(item) ? "true" : "false";
  const tabIndex = (item) => focusedId() === idOf(item) ? 0 : -1;
  const isExpanded = (item) => Boolean(item.childrenHtml && item.expanded);
  function setExpanded(item, expanded) {
    if (!item.childrenHtml || Boolean(item.expanded) === expanded) return false;
    items.set(items().map((entry) => idOf(entry) === idOf(item) ? { ...entry, expanded } : entry));
    props.onToggle?.(idOf(item), expanded);
    return true;
  }
  function toggle2(item) {
    setExpanded(item, !item.expanded);
  }
  function select2(item) {
    selectedId.set(idOf(item));
    focusedId.set(idOf(item));
    props.onSelect?.(idOf(item));
  }
  const expand = (id) => {
    const item = items().find((entry) => idOf(entry) === id);
    if (!item || !item.childrenHtml || item.expanded) return false;
    items.set(items().map((entry) => idOf(entry) === id ? { ...entry, expanded: true } : entry));
    return true;
  };
  const collapse = (id) => {
    const item = items().find((entry) => idOf(entry) === id);
    if (!item || !item.childrenHtml || !item.expanded) return false;
    items.set(items().map((entry) => idOf(entry) === id ? { ...entry, expanded: false } : entry));
    return true;
  };
  const selectById = (id) => {
    const item = items().find((entry) => idOf(entry) === id);
    if (!item) return false;
    selectedId.set(id);
    focusedId.set(id);
    return true;
  };
  const selected = () => selectedId();
  function ownItem(event) {
    const target = event.target;
    const item = target?.closest?.('[role="treeitem"]');
    if (!item || item.parentElement !== (event.currentTarget ?? null)) return null;
    return item;
  }
  function modelFromEvent(event) {
    const item = ownItem(event);
    if (!item) return null;
    const index = [...item.parentElement.children].indexOf(item);
    return items()[index] ?? null;
  }
  function onFocusin(event) {
    const model = modelFromEvent(event);
    if (model) focusedId.set(idOf(model));
  }
  function refocusItem(event, index, toButton) {
    const list = event.currentTarget;
    const li = list?.children?.[index];
    if (!li) return;
    (toButton ? li.querySelector?.("button") ?? li : li).focus?.();
  }
  function onClick(event) {
    const item = ownItem(event);
    const model = modelFromEvent(event);
    if (!model || !item) return;
    if (event.target?.closest?.("button")) {
      if (model.childrenHtml) {
        const index = [...item.parentElement.children].indexOf(item);
        toggle2(model);
        refocusItem(event, index, true);
      }
      return;
    }
    select2(model);
  }
  function onKeydown(event) {
    const item = ownItem(event);
    if (!item) return;
    const list = items();
    const index = [...item.parentElement.children].indexOf(item);
    const model = list[index];
    if (!model) return;
    let focusEl = null;
    switch (event.key) {
      case "ArrowDown":
        focusEl = item.nextElementSibling;
        break;
      case "ArrowUp":
        focusEl = item.previousElementSibling;
        break;
      case "Home":
        focusEl = item.parentElement.firstElementChild;
        break;
      case "End":
        focusEl = item.parentElement.lastElementChild;
        break;
      case "ArrowRight":
        if (model.childrenHtml && !model.expanded) {
          toggle2(model);
          refocusItem(event, index, false);
          return;
        }
        if (isExpanded(model)) focusEl = item.querySelector('[role="group"] [role="treeitem"]');
        break;
      case "ArrowLeft":
        if (isExpanded(model)) {
          toggle2(model);
          refocusItem(event, index, false);
          return;
        }
        focusEl = item.closest('[role="group"]')?.parentElement?.closest?.('[role="treeitem"]') ?? null;
        break;
      case "Enter":
      case " ":
        if (event.target?.closest?.("button")) return;
        event.preventDefault();
        select2(model);
        return;
      default:
        return;
    }
    if (focusEl) {
      event.preventDefault();
      focusEl.focus();
    }
  }
  return {
    items,
    variant,
    role,
    expandedState,
    selectedAttr,
    tabIndex,
    isExpanded,
    toggle: toggle2,
    select: select2,
    expand,
    collapse,
    selectById,
    selected,
    onFocusin,
    onClick,
    onKeydown,
    raw
  };
}
function registerVariants46(registry3) {
  registry3.registerVariant("tree", "tree");
  registry3.registerVariant("tree", "treegrid");
}
var template46 = new URL("./index.html", import.meta.url);
var styles46 = new URL("./styles.css", import.meta.url);
var tree = { name: name46, root: root46, create: create46, registerVariants: registerVariants46, template: template46, styles: styles46 };

// ../../packages/components/src/virtualizer/index.js
var name47 = "virtualizer";
var root47 = "ol";
function create47(props) {
  if (!props.id) throw new TypeError("virtualizer: id is required");
  if (typeof props.total !== "number") throw new TypeError("virtualizer: total is required");
  const id = signal(props.id);
  const total = signal(props.total);
  const scrollTop = signal(props.scrollTop ?? 0);
  const rowHeight = props.rowHeight ?? 44;
  const viewportRows = props.viewportRows ?? 8;
  const overscan = props.overscan ?? 2;
  const variant = signal(props.variant ?? "virtualizer");
  const startIndex = computed(() => Math.max(0, Math.floor(scrollTop() / rowHeight) - overscan));
  const endIndex = computed(() => Math.min(total(), startIndex() + viewportRows + overscan * 2));
  const windowIndices = computed(() => {
    const indices = [];
    for (let i = startIndex(); i < endIndex(); i += 1) indices.push(i);
    return indices;
  });
  const spacerStartCount = computed(() => startIndex());
  const spacerEndCount = computed(() => total() - endIndex());
  const itemHtml = (index) => props.itemHtmlFor?.(index) ?? "";
  const labelFor = (index) => props.labelFor?.(index) ?? "";
  const hasItemHtml = computed(() => typeof props.itemHtmlFor === "function");
  const setScrollTop = (value) => scrollTop.set(Math.max(0, value || 0));
  function onScroll(event) {
    const scroller = event.currentTarget ?? event.target;
    if (scroller && typeof scroller.scrollTop === "number") setScrollTop(scroller.scrollTop);
  }
  return {
    id,
    total,
    scrollTop,
    variant,
    startIndex,
    endIndex,
    windowIndices,
    spacerStartCount,
    spacerEndCount,
    itemHtml,
    labelFor,
    hasItemHtml,
    setScrollTop,
    onScroll,
    raw
  };
}
function registerVariants47(registry3) {
  registry3.registerVariant("virtualizer", "virtualizer");
}
function bindSpacerCounts(el, vm) {
  if (!el || typeof CSSStyleSheet === "undefined" || typeof document === "undefined") return;
  const sheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  return effect(() => {
    const id = CSS.escape(String(vm.id()));
    const start = Number(vm.spacerStartCount()) || 0;
    const end = Number(vm.spacerEndCount()) || 0;
    sheet.replaceSync(
      `#${id}{--number-virtualizer-spacer-start-count:${start};--number-virtualizer-spacer-end-count:${end}}`
    );
  });
}
var template47 = new URL("./index.html", import.meta.url);
var styles47 = new URL("./styles.css", import.meta.url);
var virtualizer = { name: name47, root: root47, create: create47, registerVariants: registerVariants47, template: template47, styles: styles47 };

// ../../packages/components/src/registry.js
var LITERAL = /[0-9#]|rgb\(|hsl\(|url\(/;
function validateTemplate(html) {
  if (/<\/?(div|span)\b/i.test(html)) {
    throw new TypeError("template: div and span are not semantic elements");
  }
  if (/\sclass\s*=/i.test(html)) {
    throw new TypeError("template: class attributes are not used; the element is the selector");
  }
  if (/\sdata-/i.test(html)) {
    throw new TypeError("template: data- attributes are not used; state lives in the view model");
  }
  const text = html.replace(/\{\{[\s\S]*?\}\}/g, "").replace(/<[^>]+>/g, "").trim();
  if (text !== "") {
    throw new TypeError(`template: literal text "${text.slice(0, 24)}" \u2014 all data is bound to the view model`);
  }
}
function validateCss(css) {
  if (/\[data-/i.test(css)) {
    throw new TypeError("styles: data- selectors are not used");
  }
  if (/(^|[\s,{>+~])\.[a-z]/i.test(css)) {
    throw new TypeError("styles: class selectors are not used; the element is the selector");
  }
  const withoutCustomProps = css.replace(/--[a-z0-9-_]+\s*:\s*[^;{}]+;/g, "");
  const declarations = withoutCustomProps.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g);
  for (const [, property, rawValue] of declarations) {
    const value = rawValue.trim();
    if (!/var\(--/.test(value)) {
      throw new TypeError(`styles: "${property}: ${value}" is not token-only \u2014 every value comes from a global custom property`);
    }
    const rest = value.replace(/var\(--[a-z0-9-_]+\)/g, "").replace(/[,\s]+/g, " ").trim();
    const restTokens = rest === "" ? [] : rest.split(" ");
    const bad = restTokens.find((token) => !/^[a-z-]+$/.test(token));
    if (LITERAL.test(rest) || bad) {
      throw new TypeError(`styles: "${property}: ${value}" is not token-only \u2014 every value comes from a global custom property`);
    }
  }
}
function createRegistry() {
  const components = /* @__PURE__ */ new Map();
  const variants = /* @__PURE__ */ new Map();
  function registerComponent(def) {
    if (!def?.name || !def?.root || typeof def?.create !== "function") {
      throw new TypeError("registerComponent: a component needs a name, a root element, and a create() view-model factory");
    }
    if (def.root === "div" || def.root === "span") {
      throw new TypeError(`registerComponent: "${def.root}" is not a semantic root element`);
    }
    if (typeof def.template === "string") validateTemplate(def.template);
    if (typeof def.styles === "string") validateCss(def.styles);
    const existing = components.get(def.name);
    if (existing && existing !== def) {
      throw new TypeError(`registerComponent: "${def.name}" is already registered with a different definition`);
    }
    components.set(def.name, def);
    if (!variants.has(def.name)) variants.set(def.name, /* @__PURE__ */ new Set());
    return def;
  }
  function registerVariant(component, name48) {
    if (!components.has(component)) {
      throw new TypeError(`registerVariant: component "${component}" is not registered \u2014 register it before its variants`);
    }
    const root48 = components.get(component).root;
    for (const [otherName, otherDef] of components) {
      if (otherName !== component && otherDef.root === root48 && variants.get(otherName)?.has(name48)) {
        throw new TypeError(`registerVariant: "${root48}[variant=\\"${name48}\\"]" is already registered by "${otherName}" \u2014 the registration tag must identify one component`);
      }
    }
    variants.get(component).add(name48);
  }
  function resolveVariant(component, name48) {
    const forComponent = variants.get(component);
    if (!forComponent?.has(name48)) {
      const known = forComponent ? [...forComponent].join(", ") : "none";
      throw new TypeError(`resolveVariant: "${component}/${name48}" is not registered (registered: ${known})`);
    }
    return name48;
  }
  function listVariants(component) {
    return [...variants.get(component) ?? []];
  }
  function listComponents() {
    return [...components.keys()];
  }
  function getComponent(name48) {
    const def = components.get(name48);
    if (!def) {
      throw new TypeError(`registry: component "${name48}" is not registered (registered: ${listComponents().join(", ") || "none"})`);
    }
    return def;
  }
  return { registerComponent, registerVariant, resolveVariant, listVariants, listComponents, getComponent };
}
var registry2 = createRegistry();
export {
  accordion,
  alert,
  appBar,
  appShell,
  avatar,
  badge,
  batch,
  bindSpacerCounts,
  breadcrumb,
  browserFeatures,
  button,
  calendar,
  card,
  checkbox,
  choiceGroup,
  codeBlock,
  combobox,
  commandPalette,
  computed,
  createErrorBoundary,
  createLazyHydrator,
  createPluginRegistry,
  createRegistry,
  createToaster,
  createVitalsReporter,
  datagrid,
  debugAssert,
  debugDeps,
  debugEffect,
  debugSignal,
  debugTime,
  definePlugin,
  detectBrowserFeatures,
  dialog,
  disableDebug,
  drawer,
  dropdownMenu,
  effect,
  emitDiagnostic,
  emptyState,
  enableDebug,
  field,
  form,
  getDebugStats,
  getDirective,
  hero,
  hydrate,
  hydrateOnIdle,
  hydrateOnInteraction,
  hydrateOnMedia,
  input,
  isDebugEnabled,
  lazyHydrate,
  listDirectives,
  listGroup,
  multiselect,
  observeCLS,
  observeFCP,
  observeFID,
  observeINP,
  observeLCP,
  observeTTFB,
  pagination,
  pipeline,
  progress,
  radio,
  rating,
  raw,
  registerDirective,
  registerPlugin,
  renderWithBoundary,
  reportHydrationMismatch,
  searchField,
  segmentedControl,
  select,
  sidebar,
  signal,
  siteFooter,
  stepper,
  supportsFeature,
  table,
  tabs,
  textarea,
  themeToggle,
  toast,
  toggle,
  toolbar,
  tooltip,
  tree,
  unregisterDirective,
  virtualizer
};
