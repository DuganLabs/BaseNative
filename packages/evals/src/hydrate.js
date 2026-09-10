/**
 * Default hydrate stage.
 *
 * validate/render never execute a template's reactive behaviour. SSR replaces every
 * `{{ }}` with its evaluated value and strips every `@`-prefixed directive from its
 * output outright (see @basenative/server's render.js: `if (name.startsWith('@'))
 * continue;`), so the rendered HTML string retains no signal, computed, or effect
 * for a stateful (T3) case to be scored against — there is nothing left to hydrate.
 *
 * BaseNative is zero-build: the directive-laden *template* is what a real browser
 * receives and hydrates in place, not a fully-evaluated SSR string. So this stage
 * mounts the template itself — not `html` — into a DOM and runs the real client
 * hydrate() against it with a live context, exactly mirroring
 * packages/runtime/src/hydrate.test.js's own cases (which likewise mount raw
 * directive markup, never rendered output).
 *
 * The DOM shim is happy-dom, already a workspace devDependency used by that same
 * test file — nothing new is added here. Its `Window` stands in for a browser well
 * enough for `document`/`Node` to be pinned onto `globalThis` for the duration of
 * the (synchronous) hydrate() call, which is how the runtime's own tests do it.
 *
 * Pinning `document` onto `globalThis` is safe under runModel's concurrent workers
 * only because every step from here through the assertion loop that reads it
 * (mounting, hydrate(), and any `after_set` signal.set()) is synchronous — nothing
 * awaits in between. If any of that ever becomes async, concurrent cases would
 * stomp on each other's `document`.
 */
export async function defaultHydrate() {
  const { Window } = await import('happy-dom');
  const { hydrate, signal } = await import('@basenative/runtime');

  /**
   * @param {string} template - the generated template markup (directives intact).
   * @param {Record<string, unknown>} state - case-declared initial values; each is
   *   wrapped in a real signal so `after_set` assertions can mutate it afterwards.
   * @returns {{ root: Element, ctx: Record<string, unknown> }}
   */
  return function domHydrate(template, state) {
    const window = new Window({ url: 'http://localhost' });
    const document = window.document;
    globalThis.document = document;
    globalThis.window = window;
    globalThis.Node = window.Node;

    const ctx = {};
    for (const [key, value] of Object.entries(state ?? {})) {
      ctx[key] = signal(value);
    }

    const root = document.createElement('div');
    root.innerHTML = template;
    document.body.append(root);
    hydrate(root, ctx);

    return { root, ctx };
  };
}
