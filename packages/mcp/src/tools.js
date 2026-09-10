import { validateTemplate } from '@basenative/validate';
import { render } from '@basenative/server';
import { compileExpression } from '@basenative/runtime/shared/expression';
import { DIRECTIVES, PRIMITIVES, FORBIDDEN } from './directives.js';

/** Render a diagnostic the way an agent should read it: what, where, and the fix. */
function formatDiagnostic(d) {
  return [
    `${d.severity.toUpperCase()} ${d.code} (line ${d.span.line}, col ${d.span.col}) [confidence: ${d.confidence}]`,
    `  ${d.message}`,
    `  fix: ${d.suggestion}`,
  ].join('\n');
}

export const TOOLS = [
  {
    name: 'validate_template',
    description:
      'Validate BaseNative template markup and return structured, repairable diagnostics. ' +
      'Call this before returning any generated template to the user. Detects syntax borrowed ' +
      'from Vue/Angular/Svelte/Alpine/React, control-flow directives placed on the wrong element, ' +
      'malformed @for, orphan branches, and expressions outside the CSP-safe subset.',
    inputSchema: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'The BaseNative template markup to validate.' },
        context: {
          type: 'object',
          description:
            'Optional context object the template will be rendered with. When supplied, ' +
            'references not present as keys are reported as BN_E_UNBOUND_REF.',
        },
      },
      required: ['template'],
    },
    handler({ template, context }) {
      const result = validateTemplate(template, context ? { context } : undefined);
      if (result.diagnostics.length === 0) {
        return { text: 'VALID — no diagnostics.' };
      }
      const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
      const warnings = result.diagnostics.length - errors;
      const header = `${result.valid ? 'VALID with warnings' : 'INVALID'} — ${errors} error(s), ${warnings} warning(s).`;
      return {
        text: [header, '', ...result.diagnostics.map(formatDiagnostic)].join('\n'),
        isError: !result.valid,
      };
    },
  },

  {
    name: 'render_preview',
    description:
      'Server-render a BaseNative template with a context object and return the resulting HTML. ' +
      'Use this to confirm a template produces the markup you intended, not merely that it parses.',
    inputSchema: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'The template markup to render.' },
        context: { type: 'object', description: 'Values referenced by the template.' },
      },
      required: ['template'],
    },
    handler({ template, context = {} }) {
      // Validate first: rendering invalid markup produces confusing output rather
      // than an error, which is precisely the failure this server exists to prevent.
      const check = validateTemplate(template, { context });
      if (!check.valid) {
        return {
          text: [
            'Not rendered — the template is invalid. Fix these first:',
            '',
            ...check.diagnostics.filter((d) => d.severity === 'error').map(formatDiagnostic),
          ].join('\n'),
          isError: true,
        };
      }
      try {
        return { text: render(template, context) };
      } catch (err) {
        return { text: `Render failed: ${err.message}`, isError: true };
      }
    },
  },

  {
    name: 'list_directives',
    description:
      'The full BaseNative directive reference — every directive, its signature, an example, ' +
      'and the syntax from other frameworks that must NOT be used in its place. ' +
      'Query this when unsure of the exact form rather than guessing from a neighbouring framework.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description:
            "Optional. A directive name such as '@for', or one of 'primitives' or 'forbidden'.",
        },
      },
    },
    handler({ filter } = {}) {
      if (filter === 'primitives') {
        return { text: PRIMITIVES.map((p) => `${p.signature}\n  ${p.summary}`).join('\n\n') };
      }
      if (filter === 'forbidden') {
        return {
          text: FORBIDDEN.map((f) => `${f.foreign}  (${f.framework})\n  use instead: ${f.use}`).join('\n\n'),
        };
      }
      const list = filter
        ? DIRECTIVES.filter((d) => d.name.toLowerCase().includes(filter.toLowerCase().replace(/^@/, '')))
        : DIRECTIVES;
      if (list.length === 0) {
        return {
          text: `No directive matching "${filter}". Valid names: ${DIRECTIVES.map((d) => d.name).join(', ')}`,
          isError: true,
        };
      }
      return {
        text: list
          .map((d) =>
            [
              `${d.name}  (on: ${d.on})`,
              `  ${d.signature}`,
              `  ${d.summary}`,
              `  example: ${d.example}`,
              `  note: ${d.notes}`,
            ].join('\n')
          )
          .join('\n\n'),
      };
    },
  },

  {
    name: 'check_expression',
    description:
      'Check whether a single expression is inside the CSP-safe subset the BaseNative evaluator ' +
      'accepts. Use before embedding an expression in a template. The subset has no arrow ' +
      'functions, no `new`, no optional chaining, no nullish coalescing, and blocks prototype access.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'The expression source, without {{ }}.' },
      },
      required: ['expression'],
    },
    handler({ expression }) {
      const compiled = compileExpression(expression);
      if (compiled.error) {
        return {
          text:
            `OUTSIDE SUBSET — ${compiled.error.code} at offset ${compiled.error.index}.\n` +
            'Supported: identifiers, member and computed access, calls, literals, ' +
            'unary/binary/logical/conditional operators, array and object literals.\n' +
            'Not supported: arrow functions, `new`, optional chaining, `??`, assignment, template literals.\n' +
            'Remedy: move the logic into a named function on the context and call it.',
          isError: true,
        };
      }
      // Reuse the validator so "is this safe" cannot drift from what it reports.
      const wrapped = validateTemplate(`<p>{{ ${expression} }}</p>`);
      const blocked = wrapped.diagnostics.filter((d) => d.code === 'BN_E_EXPR_UNSUPPORTED');
      if (blocked.length > 0) {
        return { text: `OUTSIDE SUBSET — ${blocked[0].message}\n${blocked[0].suggestion}`, isError: true };
      }
      return { text: 'INSIDE SUBSET — this expression is safe to embed.' };
    },
  },

  {
    name: 'scaffold_component',
    description:
      'Generate a Trinity Standard component skeleton — state, logic, and template fused in one ' +
      'file, which is how BaseNative components are structured. Returns valid, ready-to-edit source.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name in PascalCase, e.g. UserCard.' },
        features: {
          type: 'array',
          items: { type: 'string', enum: ['list', 'conditional', 'form'] },
          description: 'Optional directives to include in the skeleton.',
        },
      },
      required: ['name'],
    },
    handler({ name, features = [] }) {
      const pascal = String(name).replace(/(^\w|[-_ ]\w)/g, (s) => s.replace(/[-_ ]/, '').toUpperCase());
      const kebab = pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      const has = (f) => features.includes(f);

      const body = [
        has('conditional') &&
          `    <template @if="isReady()">\n      <p>{{ title() }}</p>\n    </template>\n    <template @else>\n      <p>Loading…</p>\n    </template>`,
        has('list') &&
          `    <template @for="item of items(); track item.id">\n      <li :class="item.done ? 'done' : ''">{{ item.label }}</li>\n    </template>\n    <template @empty>\n      <li>Nothing yet</li>\n    </template>`,
        has('form') &&
          `    <form @submit="submit($event)">\n      <input :value="draft()" @input="draft.set($event.target.value)">\n      <button :disabled="!draft()">Add</button>\n    </form>`,
        !features.length && `    <p>{{ title() }}</p>`,
      ]
        .filter(Boolean)
        .join('\n');

      const source = `import { signal, computed } from '@basenative/runtime';

/**
 * ${pascal} — Trinity Standard: state, logic, and template in one file.
 */
export function create${pascal}(props = {}) {
  // --- state ---
  const title = signal(props.title ?? '${pascal}');
${has('list') ? `  const items = signal(props.items ?? []);\n` : ''}${has('form') ? `  const draft = signal('');\n` : ''}${has('conditional') ? `  const ready = signal(false);\n` : ''}
  // --- logic ---
${has('conditional') ? `  const isReady = computed(() => ready());\n` : ''}${
        has('form')
          ? `  function submit($event) {\n    $event.preventDefault();\n    if (!draft()) return;\n${has('list') ? `    items.set([...items(), { id: crypto.randomUUID(), label: draft(), done: false }]);\n` : ''}    draft.set('');\n  }\n`
          : ''
      }
  // --- template ---
  const template = \`
  <div class="${kebab}">
${body}
  </div>\`;

  return { template, context: { title${has('list') ? ', items' : ''}${has('form') ? ', draft, submit' : ''}${has('conditional') ? ', isReady' : ''} } };
}
`;

      // Never hand back a skeleton that would fail the validator.
      const tmplMatch = /const template = `([\s\S]*?)`;/.exec(source);
      const check = validateTemplate(tmplMatch ? tmplMatch[1] : '');
      const warn = check.valid
        ? ''
        : `\n\n/* WARNING: generated template failed validation:\n${check.diagnostics.map(formatDiagnostic).join('\n')}\n*/`;
      return { text: source + warn };
    },
  },
];

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));
