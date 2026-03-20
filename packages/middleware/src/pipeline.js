/**
 * Server-agnostic middleware pipeline.
 *
 * Each middleware is a function: (ctx, next) => Promise<void> | void
 * Context (ctx) is a plain object with { request, response, state }.
 * Adapters translate server-specific objects into this common shape.
 */

export function createPipeline() {
  const stack = [];

  function use(middleware) {
    if (typeof middleware !== 'function') {
      throw new TypeError('Middleware must be a function');
    }
    stack.push(middleware);
    return pipeline;
  }

  async function run(ctx) {
    let index = 0;

    async function next() {
      if (index >= stack.length) return;
      const mw = stack[index++];
      await mw(ctx, next);
    }

    await next();
    return ctx;
  }

  function toHandler() {
    return run;
  }

  const pipeline = { use, run, toHandler, get stack() { return [...stack]; } };
  return pipeline;
}

/**
 * Compose multiple middlewares into a single middleware function.
 */
export function compose(...middlewares) {
  const flat = middlewares.flat();
  return async (ctx, next) => {
    let index = 0;

    async function dispatch() {
      if (index >= flat.length) {
        return next?.();
      }
      const mw = flat[index++];
      await mw(ctx, dispatch);
    }

    await dispatch();
  };
}
