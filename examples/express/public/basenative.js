// ../../packages/runtime/src/signals.js
var currentEffect = null;
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
      value = resolved;
      for (const effectRef of [...subs]) effectRef.run();
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

// ../../src/shared/expression.js
var SCOPE_SLOT = Symbol.for("basenative.scopeSlot");
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
      let raw = char;
      index++;
      while (index < source.length && /[0-9.]/.test(source[index])) {
        raw += source[index];
        index++;
      }
      if (!/^(\d+|\d+\.\d+)$/.test(raw)) {
        throw createExpressionError(
          "BN_EXPR_INVALID_NUMBER",
          `Invalid numeric literal "${raw}"`,
          source,
          start
        );
      }
      tokens.push({ type: "number", value: Number(raw), index: start });
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
  if (typeof property === "string" && UNSAFE_PROPERTIES.has(property)) {
    throw createExpressionError(
      "BN_EXPR_UNSAFE_MEMBER",
      `Access to "${property}" is not allowed in BaseNative expressions`,
      source
    );
  }
  return object[property];
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

// ../../packages/runtime/src/evaluate.js
function evaluate(expr, ctx, options) {
  return evaluateExpression(expr, ctx, options);
}
function interpolate(text, ctx, options) {
  return text.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    const val = evaluate(expr, ctx, options);
    return val != null ? val : "";
  });
}

// ../../packages/runtime/src/dom-lifecycle.js
var CLEANUPS = Symbol("basenative.cleanups");
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

// ../../packages/runtime/src/bind.js
function bindNode(node, ctx, options) {
  let processed = 0;
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent;
    if (raw.includes("{{")) {
      const runner = effect(() => {
        node.textContent = interpolate(raw, ctx, options);
      });
      registerCleanup(node, () => runner.dispose?.());
      processed++;
    }
    return processed;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === "TEMPLATE") return processed;
  for (const attr of [...node.attributes]) {
    if (attr.name.startsWith("@")) {
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
        if (result === false || result == null) node.removeAttribute(attrName);
        else node.setAttribute(attrName, result);
      });
      registerCleanup(node, () => runner.dispose?.());
      node.removeAttribute(attr.name);
      processed++;
    } else if (attr.value.includes("{{")) {
      const raw = attr.value;
      const name = attr.name;
      const runner = effect(() => {
        node.setAttribute(name, interpolate(raw, ctx, options));
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
      }
      continue;
    }
    processed += bindNode(node, ctx, options);
  }
  return processed;
}
function hydrate(root, ctx, options = {}) {
  const runtimeOptions = createRuntimeOptions(options);
  const processed = hydrateChildren(root, ctx, runtimeOptions);
  if (processed === 0) {
    const markerMessage = hasHydrationMarkers(root) ? "hydrate() found server render markers but no template source; this build can diagnose SSR boundaries, but it still recovers by client-side template hydration only" : "hydrate() found no BaseNative template directives in the target root";
    reportHydrationMismatch(runtimeOptions, markerMessage, {
      code: hasHydrationMarkers(root) ? "BN_HYDRATE_MARKERS_WITHOUT_TEMPLATE" : "BN_HYDRATE_NO_DIRECTIVES"
    });
  }
  return () => disposeNodeTree(root);
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
var browserFeatures = detectBrowserFeatures();
export {
  browserFeatures,
  computed,
  detectBrowserFeatures,
  effect,
  emitDiagnostic,
  hydrate,
  reportHydrationMismatch,
  signal,
  supportsFeature
};
