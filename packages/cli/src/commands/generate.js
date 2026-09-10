// Built with BaseNative — basenative.dev
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const generators = {
  component: generateComponent,
  route: generateRoute,
  page: generatePage,
};

/**
 * Create a new file, refusing to clobber one that already exists.
 *
 * Uses an exclusive-create write (`flag: 'wx'`) instead of an
 * `existsSync` check followed by a separate `writeFileSync`: checking then
 * acting on a path is racy (the file can be created in between), so the
 * existence check and the write are done as one atomic filesystem call.
 */
function writeIfAbsent(filePath, content, alreadyExistsMessage) {
  try {
    writeFileSync(filePath, content, { flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.error(alreadyExistsMessage);
      process.exit(1);
    }
    throw err;
  }
}

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
  bn generate <type> <name> [options]

  Types:
    component <Name>    Generate a new component
    route <path>        Generate a new route handler
    page <name>         Generate a new page view

  Examples:
    bn generate component UserCard
    bn generate route /api/users
    bn generate page dashboard
`);
    return;
  }

  const [type, name] = positionals;
  const generator = generators[type];

  if (!generator) {
    console.error(`Unknown type: ${type}\nAvailable: ${Object.keys(generators).join(', ')}`);
    process.exit(1);
    return;
  }

  if (!name) {
    console.error(`Please provide a name: bn generate ${type} <name>`);
    process.exit(1);
    return;
  }

  generator(name);
}

function generateComponent(name) {
  const kebab = toKebab(name);
  const dir = resolve(process.cwd(), 'src', 'components');
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `${kebab}.js`);
  writeIfAbsent(
    filePath,
    `/**
 * Render a ${name} component.
 * @param {object} props
 * @returns {string} HTML string
 */
export function render${name}(props = {}) {
  return \`<div data-bn="${kebab}">
  <!-- ${name} component -->
</div>\`;
}
`,
    `Component already exists: ${filePath}`
  );

  console.log(`Created component: src/components/${kebab}.js`);
}

function generateRoute(path) {
  const dir = resolve(process.cwd(), 'src', 'routes');
  mkdirSync(dir, { recursive: true });

  const name = path.replace(/^\//, '').replace(/\//g, '-') || 'index';
  const filePath = join(dir, `${name}.js`);

  writeIfAbsent(
    filePath,
    `/**
 * Route handler for ${path}
 */
export function handler(req, res) {
  res.json({ path: '${path}' });
}
`,
    `Route already exists: ${filePath}`
  );

  console.log(`Created route: src/routes/${name}.js`);
}

function generatePage(name) {
  const dir = resolve(process.cwd(), 'views');
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `${name}.html`);
  writeIfAbsent(
    filePath,
    `<section aria-label="${name}">
  <h2>${name.charAt(0).toUpperCase() + name.slice(1)}</h2>
</section>
`,
    `Page already exists: ${filePath}`
  );

  console.log(`Created page: views/${name}.html`);
}

function toKebab(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
