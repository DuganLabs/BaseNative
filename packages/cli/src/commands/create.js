#!/usr/bin/env node
// Built with BaseNative — basenative.dev
/**
 * `bn create <name>` — scaffold a new BaseNative project from a template.
 *
 * Templates live in `packages/cli/templates/<name>/`. The legacy templates
 * (`minimal`, `enterprise`, `api`) are preserved as in-memory generators so
 * existing tests + npx flows keep working. The new opinionated templates
 * (`webapp`, `worker`, `library`, `t4bs`) live on disk and are rendered via
 * `lib/template.js`.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { renderTemplate, toSlug } from '../lib/template.js';
import { c, ok, err, info, banner, kv, hint } from '../lib/colors.js';
import { gitInit, gitAddAll, gitCommit, isGitInstalled } from '../lib/git.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '..', '..', 'templates');

const DISK_TEMPLATES = ['webapp', 'worker', 'library', 't4bs'];
const LEGACY_TEMPLATES = {
  minimal: { description: 'Legacy minimal starter (runtime + server)', files: generateMinimalTemplate },
  enterprise: { description: 'Legacy enterprise starter', files: generateEnterpriseTemplate },
  api: { description: 'Legacy API-only starter', files: generateApiTemplate },
};

function showHelp() {
  console.log(`
  ${c.bold('bn create')} ${c.gray('<name>')} ${c.gray('[options]')}

  Scaffold a new BaseNative project.

  ${c.bold('Options')}
    -t, --template <id>   Template id [default: minimal — recommended: webapp]
        --description <s> Project description
        --no-git          Skip git init + initial commit
        --dry-run         Print what would be written; touch nothing
        --json            Machine-readable output
    -h, --help            Show this help

  ${c.bold('Templates')}
    ${c.accent('webapp')}    Cloudflare Pages SPA + Worker on BaseNative ${c.gray('(default)')}
    ${c.accent('worker')}    Cloudflare Worker (API / cron / queue)
    ${c.accent('library')}   npm-publishable library
    ${c.accent('t4bs')}      T4BS-style game (uses og-image, keyboard, share)

    ${c.dim('Legacy: minimal, enterprise, api (kept for back-compat)')}

  ${c.bold('Examples')}
    bn create my-app
    bn create my-game --template t4bs
    bn create my-lib  --template library --description "tiny lib"
`);
}

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      template: { type: 'string', short: 't', default: 'minimal' },
      description: { type: 'string' },
      'no-git': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    showHelp();
    return;
  }

  const name = positionals[0];
  if (!name) {
    err('Missing project name. Try: bn create my-app');
    hint('Run "bn create --help" for templates and options.');
    process.exit(1);
  }

  const slug = toSlug(name);
  const template = values.template;

  const projectDir = resolve(process.cwd(), name);
  if (existsSync(projectDir) && !values['dry-run']) {
    err(`Directory "${name}" already exists.`);
    hint('Pick a different name or remove the existing directory.');
    process.exit(1);
  }

  const description = values.description || `A BaseNative ${template} project.`;
  const compatDate = new Date().toISOString().slice(0, 10);
  const tplVars = { name: slug, description, compatDate };

  // ---- Disk-backed templates ----
  if (DISK_TEMPLATES.includes(template)) {
    const srcDir = join(TEMPLATES_DIR, template);
    if (!existsSync(srcDir)) {
      err(`Template "${template}" not found at ${srcDir}`);
      process.exit(1);
    }

    if (!values.json) {
      banner();
      console.log(kv('Project', c.bold(slug)));
      console.log(kv('Template', c.accent(template)));
      console.log(kv('Location', c.dim(projectDir)));
      console.log('');
    }

    const result = renderTemplate(srcDir, projectDir, tplVars, {
      overwrite: false,
      dryRun: values['dry-run'],
      onFile: values.json
        ? undefined
        : (rel) => console.log(`  ${c.green('+')} ${c.dim(rel)}`),
    });

    if (values['dry-run']) {
      if (values.json) {
        console.log(JSON.stringify({ name: slug, template, files: result.written, dryRun: true }, null, 2));
      } else {
        info(`Dry run — ${result.written.length} file(s) would be written.`);
      }
      return result;
    }

    // Optional git init
    let gitOk = false;
    if (!values['no-git'] && isGitInstalled()) {
      const init = gitInit(projectDir);
      if (init.ok) {
        gitAddAll(projectDir);
        const commit = gitCommit(projectDir, 'chore: initial commit (bn create)');
        gitOk = commit.ok;
      }
    }

    if (values.json) {
      console.log(JSON.stringify({ name: slug, template, files: result.written, git: gitOk }, null, 2));
      return result;
    }

    console.log('');
    ok(`Scaffold complete — ${result.written.length} file(s).`);
    if (gitOk) ok('Initialized git repo with first commit.');
    console.log('');
    console.log(c.bold('  Next steps'));
    console.log(`    ${c.gray('$')} cd ${name}`);
    console.log(`    ${c.gray('$')} pnpm install`);
    console.log(`    ${c.gray('$')} bn dev`);
    console.log('');
    return result;
  }

  // ---- Legacy in-memory templates ----
  if (!LEGACY_TEMPLATES[template]) {
    err(`Unknown template: ${template}`);
    info(`Available: ${[...DISK_TEMPLATES, ...Object.keys(LEGACY_TEMPLATES)].join(', ')}`);
    process.exit(1);
  }

  console.log(`Creating BaseNative project: ${name}`);
  console.log(`Template: ${template}`);

  const files = LEGACY_TEMPLATES[template].files(slug);
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(projectDir, filePath);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content);
  }

  console.log(`
  Project created at ./${name}

  Next steps:
    cd ${name}
    npm install
    npm run dev
`);
}

// ---- Legacy generators (preserved for tests) ----

function generateMinimalTemplate(name) {
  return {
    'package.json':
      JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          scripts: { dev: 'node --watch server.js', start: 'node server.js' },
          dependencies: {
            '@basenative/runtime': '^0.2.0',
            '@basenative/server': '^0.2.0',
            express: '^5.1.0',
          },
        },
        null,
        2,
      ) + '\n',
    'server.js': `// Built with BaseNative — basenative.dev
import express from 'express';
import { readFileSync } from 'node:fs';
import { render } from '@basenative/server';

const app = express();
app.use(express.static('public'));

app.get('/', (_req, res) => {
  const template = readFileSync('views/home.html', 'utf-8');
  res.send(render(template, { title: '${name}', message: 'Welcome to BaseNative!' }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running at http://localhost:\${PORT}\`));
`,
    'views/home.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
</head>
<body>
  <h1>{{ title }}</h1>
  <p>{{ message }}</p>
</body>
</html>
`,
    'public/.gitkeep': '',
    '.env': `PORT=3000\nNODE_ENV=development\n`,
    '.env.example': `PORT=3000\nNODE_ENV=development\n`,
    '.gitignore': `node_modules/\ndist/\n.env.local\n.env.*.local\n`,
  };
}

function generateEnterpriseTemplate(name) {
  return {
    ...generateMinimalTemplate(name),
    'package.json':
      JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          scripts: {
            dev: 'node --watch server.js',
            start: 'node server.js',
            build: 'node build.js',
          },
          dependencies: {
            '@basenative/runtime': '^0.2.0',
            '@basenative/server': '^0.2.0',
            '@basenative/router': '^0.2.0',
            '@basenative/forms': '^0.2.0',
            '@basenative/components': '^0.2.0',
            '@basenative/middleware': '^0.2.0',
            '@basenative/config': '^0.2.0',
            express: '^5.1.0',
          },
        },
        null,
        2,
      ) + '\n',
    'server.js': `// Built with BaseNative — basenative.dev
import express from 'express';
import { readFileSync } from 'node:fs';
import { render } from '@basenative/server';
import { createPipeline, cors, logger, rateLimit } from '@basenative/middleware';
import { toExpressMiddleware } from '@basenative/middleware/express';
import { loadEnv, defineConfig, string, number, optional } from '@basenative/config';

loadEnv();

const config = defineConfig({
  schema: {
    PORT: optional(number({ min: 1, max: 65535 }), 3000),
    NODE_ENV: optional(string(), 'development'),
  },
});

const app = express();

const pipeline = createPipeline();
pipeline.use(logger({ json: config.NODE_ENV === 'production' }));
pipeline.use(cors());
pipeline.use(rateLimit({ max: 100, windowMs: 60000 }));

app.use(toExpressMiddleware(pipeline));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (_req, res) => {
  const template = readFileSync('views/home.html', 'utf-8');
  res.send(render(template, { title: '${name}' }));
});

app.listen(config.PORT, () => {
  console.log(\`Server running at http://localhost:\${config.PORT}\`);
});
`,
    'views/home.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
</head>
<body>
  <h1>{{ title }}</h1>
  <p>Enterprise BaseNative application ready.</p>
</body>
</html>
`,
  };
}

function generateApiTemplate(name) {
  return {
    'package.json':
      JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          scripts: { dev: 'node --watch server.js', start: 'node server.js' },
          dependencies: {
            '@basenative/middleware': '^0.2.0',
            '@basenative/config': '^0.2.0',
            express: '^5.1.0',
          },
        },
        null,
        2,
      ) + '\n',
    'server.js': `// Built with BaseNative — basenative.dev
import express from 'express';
import { createPipeline, cors, logger, rateLimit } from '@basenative/middleware';
import { toExpressMiddleware } from '@basenative/middleware/express';
import { loadEnv, defineConfig, number, optional } from '@basenative/config';

loadEnv();

const config = defineConfig({
  schema: {
    PORT: optional(number({ min: 1, max: 65535 }), 3000),
  },
});

const app = express();

const pipeline = createPipeline();
pipeline.use(logger({ json: true }));
pipeline.use(cors());
pipeline.use(rateLimit({ max: 100, windowMs: 60000 }));

app.use(toExpressMiddleware(pipeline));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.PORT, () => {
  console.log(\`API running at http://localhost:\${config.PORT}\`);
});
`,
    '.env': `PORT=3000\nNODE_ENV=development\n`,
    '.env.example': `PORT=3000\nNODE_ENV=development\n`,
    '.gitignore': `node_modules/\ndist/\n.env.local\n.env.*.local\n`,
  };
}
