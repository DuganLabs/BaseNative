import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage, PROTOCOL_VERSION } from './index.js';

const rpc = (method, params, id = 1) => handleMessage({ jsonrpc: '2.0', id, method, params });
const call = (name, args) => rpc('tools/call', { name, arguments: args });
const textOf = (res) => res.result.content[0].text;

describe('protocol', () => {
  it('responds to initialize with the protocol version and tool capability', () => {
    const r = rpc('initialize');
    assert.equal(r.result.protocolVersion, PROTOCOL_VERSION);
    assert.ok(r.result.capabilities.tools);
    assert.equal(r.result.serverInfo.name, 'basenative');
  });

  it('lists all five tools with a schema each', () => {
    const { tools } = rpc('tools/list').result;
    assert.equal(tools.length, 5);
    for (const t of tools) {
      assert.ok(t.name && t.description);
      assert.equal(t.inputSchema.type, 'object');
    }
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ['check_expression', 'list_directives', 'render_preview', 'scaffold_component', 'validate_template']
    );
  });

  it('answers ping', () => {
    assert.deepEqual(rpc('ping').result, {});
  });

  it('returns null for notifications rather than a response', () => {
    assert.equal(handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  });

  it('rejects a non-2.0 envelope', () => {
    assert.equal(handleMessage({ jsonrpc: '1.0', id: 1, method: 'ping' }).error.code, -32600);
  });

  it('reports unknown methods and unknown tools', () => {
    assert.equal(rpc('nope').error.code, -32601);
    assert.equal(call('no_such_tool', {}).error.code, -32602);
  });

  it('surfaces a handler throw as an isError result, not a crash', () => {
    // Missing required argument — the handler must not take the process down.
    const r = call('check_expression', {});
    assert.equal(r.result.isError, true);
  });
});

describe('validate_template', () => {
  it('reports valid markup', () => {
    const r = call('validate_template', { template: '<template @if="a"><p>x</p></template>' });
    assert.match(textOf(r), /^VALID/);
    assert.equal(r.result.isError, false);
  });

  it('flags foreign syntax and includes the concrete fix', () => {
    const r = call('validate_template', { template: '<div v-if="a">x</div>' });
    assert.equal(r.result.isError, true);
    assert.match(textOf(r), /BN_E_FOREIGN_DIRECTIVE/);
    assert.match(textOf(r), /fix: <template @if="a">/);
  });

  it('reports unbound references when a context is supplied', () => {
    const r = call('validate_template', { template: '<p>{{ itmes }}</p>', context: { items: [] } });
    assert.match(textOf(r), /BN_E_UNBOUND_REF/);
    assert.match(textOf(r), /Did you mean "items"/);
  });

  it('stays valid for warning-only input', () => {
    const r = call('validate_template', { template: '<template @for="i of items">x</template>' });
    assert.match(textOf(r), /VALID with warnings/);
    assert.equal(r.result.isError, false);
  });
});

describe('render_preview', () => {
  it('renders a template with its context', () => {
    const r = call('render_preview', {
      template: '<template @if="user"><p>{{ user.name }}</p></template>',
      context: { user: { name: 'Ada' } },
    });
    assert.equal(textOf(r), '<p>Ada</p>');
  });

  it('renders a tracked list', () => {
    const r = call('render_preview', {
      template: '<template @for="i of items; track i.id"><li>{{ i.name }}</li></template>',
      context: { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] },
    });
    assert.match(textOf(r), /<li>a<\/li>/);
    assert.match(textOf(r), /<li>b<\/li>/);
  });

  // Rendering invalid markup silently produces confusing output rather than an
  // error, which is the failure this server exists to prevent.
  it('refuses to render invalid markup and explains why', () => {
    const r = call('render_preview', { template: '<div v-if="a">x</div>', context: {} });
    assert.equal(r.result.isError, true);
    assert.match(textOf(r), /Not rendered/);
    assert.match(textOf(r), /BN_E_FOREIGN_DIRECTIVE/);
  });
});

describe('list_directives', () => {
  it('returns the full reference by default', () => {
    const text = textOf(call('list_directives', {}));
    for (const d of ['@if', '@for', '@switch', '@defer', '@feature', '@t', ':<attr>', '{{ }}']) {
      assert.ok(text.includes(d), `missing ${d}`);
    }
  });

  it('filters to a single directive', () => {
    const text = textOf(call('list_directives', { filter: '@for' }));
    assert.match(text, /item of items; track item\.id/);
    assert.ok(!text.includes('@switch'));
  });

  it('describes @feature as a plugin-contributed template directive with an @else example', () => {
    const text = textOf(call('list_directives', { filter: '@feature' }));
    assert.match(text, /template/);
    assert.match(text, /@basenative\/flags/);
    assert.match(text, /@else/);
    assert.match(text, /BN_FEATURE_NO_PROVIDER/);
  });

  it('describes @t as a plugin-contributed element directive', () => {
    // 't' as a substring matches several other directives too (switch, default,
    // catch, feature...) — this only pins down that @t's own entry is present.
    const text = textOf(call('list_directives', { filter: '@t' }));
    assert.match(text, /<span @t="message\.key">/);
    assert.match(text, /@basenative\/i18n/);
    assert.match(text, /BN_T_NO_PROVIDER/);
  });

  it('exposes the forbidden-syntax map', () => {
    const text = textOf(call('list_directives', { filter: 'forbidden' }));
    assert.match(text, /v-if/);
    assert.match(text, /\$state/);
    assert.match(text, /useState/);
  });

  it('exposes the reactivity primitives', () => {
    const text = textOf(call('list_directives', { filter: 'primitives' }));
    assert.match(text, /signal\(initial\)/);
    assert.match(text, /computed\(fn\)/);
  });

  it('errors helpfully on an unknown filter', () => {
    const r = call('list_directives', { filter: '@nonsense' });
    assert.equal(r.result.isError, true);
    assert.match(textOf(r), /Valid names/);
  });
});

describe('check_expression', () => {
  it('accepts expressions inside the subset', () => {
    for (const e of ['user.name', 'items[0]', 'a ? b : c', 'count() + 1', "s === 'x'"]) {
      assert.match(textOf(call('check_expression', { expression: e })), /INSIDE SUBSET/, e);
    }
  });

  it('rejects syntax outside the subset and names the remedy', () => {
    for (const e of ['a?.b', 'a ?? b', '(x => x)(1)', 'new Date()']) {
      const r = call('check_expression', { expression: e });
      assert.equal(r.result.isError, true, e);
      assert.match(textOf(r), /OUTSIDE SUBSET/, e);
    }
  });

  it('rejects blocked prototype access', () => {
    for (const e of ['x.constructor', 'x[["constructor"]]']) {
      assert.equal(call('check_expression', { expression: e }).result.isError, true, e);
    }
  });
});

describe('scaffold_component', () => {
  it('produces a Trinity Standard skeleton', () => {
    const text = textOf(call('scaffold_component', { name: 'UserCard' }));
    assert.match(text, /--- state ---/);
    assert.match(text, /--- logic ---/);
    assert.match(text, /--- template ---/);
    assert.match(text, /createUserCard/);
    assert.match(text, /class="user-card"/);
  });

  it('normalises kebab and snake names to PascalCase', () => {
    assert.match(textOf(call('scaffold_component', { name: 'todo-list' })), /createTodoList/);
    assert.match(textOf(call('scaffold_component', { name: 'todo_list' })), /createTodoList/);
  });

  it('includes requested features with correct directive syntax', () => {
    const text = textOf(call('scaffold_component', { name: 'Todo', features: ['list', 'form'] }));
    assert.match(text, /@for="item of items\(\); track item\.id"/);
    assert.match(text, /<template @empty>/);
    assert.match(text, /@submit="submit\(\$event\)"/);
  });

  // The scaffolder must never emit markup its own validator would reject.
  it('never emits a template that fails validation', () => {
    for (const features of [[], ['list'], ['conditional'], ['form'], ['list', 'form', 'conditional']]) {
      const text = textOf(call('scaffold_component', { name: 'Thing', features }));
      assert.ok(!text.includes('WARNING: generated template failed validation'), features.join('+'));
    }
  });
});

describe('stdio transport', () => {
  it('reads newline-delimited JSON and writes one response per request', async () => {
    const { PassThrough } = await import('node:stream');
    const { serve } = await import('./server.js');
    const input = new PassThrough();
    const output = new PassThrough();
    const seen = [];
    output.on('data', (chunk) => {
      for (const line of String(chunk).split('\n')) if (line.trim()) seen.push(JSON.parse(line));
    });

    serve({ input, output });
    input.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n');
    input.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    input.write('{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n');
    await new Promise((r) => setImmediate(r));

    // The notification must not produce a response.
    assert.equal(seen.length, 2);
    assert.equal(seen[0].id, 1);
    assert.equal(seen[0].result.serverInfo.name, 'basenative');
    assert.equal(seen[1].id, 2);
    assert.equal(seen[1].result.tools.length, 5);
  });

  it('handles a message split across chunk boundaries', async () => {
    const { PassThrough } = await import('node:stream');
    const { serve } = await import('./server.js');
    const input = new PassThrough();
    const output = new PassThrough();
    const seen = [];
    output.on('data', (c) => {
      for (const line of String(c).split('\n')) if (line.trim()) seen.push(JSON.parse(line));
    });

    serve({ input, output });
    input.write('{"jsonrpc":"2.0","id":7,"me');
    await new Promise((r) => setImmediate(r));
    assert.equal(seen.length, 0, 'responded before the message was complete');
    input.write('thod":"ping"}\n');
    await new Promise((r) => setImmediate(r));
    assert.equal(seen.length, 1);
    assert.equal(seen[0].id, 7);
  });

  it('reports a parse error for malformed JSON without dying', async () => {
    const { PassThrough } = await import('node:stream');
    const { serve } = await import('./server.js');
    const input = new PassThrough();
    const output = new PassThrough();
    const seen = [];
    output.on('data', (c) => {
      for (const line of String(c).split('\n')) if (line.trim()) seen.push(JSON.parse(line));
    });

    serve({ input, output });
    input.write('{not json\n');
    input.write('{"jsonrpc":"2.0","id":9,"method":"ping"}\n');
    await new Promise((r) => setImmediate(r));
    assert.equal(seen[0].error.code, -32700);
    assert.equal(seen[1].id, 9, 'server stopped processing after a bad message');
  });
});
