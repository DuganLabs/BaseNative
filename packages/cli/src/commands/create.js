#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const TEMPLATES = {
  minimal: {
    description: 'Minimal starter with runtime + server',
    files: generateMinimalTemplate,
  },
  enterprise: {
    description: 'Full enterprise setup with middleware, config, and components',
    files: generateEnterpriseTemplate,
  },
  api: {
    description: 'API-only server with middleware and config',
    files: generateApiTemplate,
  },
};

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      template: { type: 'string', short: 't', default: 'minimal' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
  bn create <project-name> [options]

  Options:
    --template, -t   Template to use (minimal, enterprise, api) [default: minimal]
    --help, -h       Show this help

  Templates:
    minimal      Minimal starter with runtime + server
    enterprise   Full enterprise setup with middleware, config, and components
    api          API-only server with middleware and config
`);
    return;
  }

  const name = positionals[0];
  if (!name) {
    console.error('Please provide a project name: bn create <name>');
    process.exit(1);
  }

  const template = values.template;
  if (!TEMPLATES[template]) {
    console.error(`Unknown template: ${template}\nAvailable: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  const projectDir = resolve(process.cwd(), name);

  if (existsSync(projectDir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  console.log(`Creating BaseNative project: ${name}`);
  console.log(`Template: ${template}`);

  const files = TEMPLATES[template].files(name);

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

function generateMinimalTemplate(name) {
  return {
    'package.json': JSON.stringify({
      name,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'node --watch server.js',
        start: 'node server.js',
      },
      dependencies: {
        '@basenative/runtime': '^0.2.0',
        '@basenative/server': '^0.2.0',
        express: '^5.1.0',
      },
    }, null, 2) + '\n',
    'server.js': `import express from 'express';
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
    '.env': `PORT=3000
NODE_ENV=development
`,
    '.env.example': `PORT=3000
NODE_ENV=development
`,
    '.gitignore': `node_modules/
dist/
.env.local
.env.*.local
`,
  };
}

function generateEnterpriseTemplate(name) {
  return {
    ...generateMinimalTemplate(name),
    'package.json': JSON.stringify({
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
    }, null, 2) + '\n',
    'server.js': `import express from 'express';
import { readFileSync } from 'node:fs';
import { render } from '@basenative/server';
import { createPipeline, cors, logger, rateLimit } from '@basenative/middleware';
import { toExpressMiddleware } from '@basenative/middleware/express';
import { loadEnv, defineConfig, string, number, optional } from '@basenative/config';

// Load environment variables
loadEnv();

const config = defineConfig({
  schema: {
    PORT: optional(number({ min: 1, max: 65535 }), 3000),
    NODE_ENV: optional(string(), 'development'),
  },
});

const app = express();

// Setup middleware pipeline
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
    'package.json': JSON.stringify({
      name,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'node --watch server.js',
        start: 'node server.js',
      },
      dependencies: {
        '@basenative/middleware': '^0.2.0',
        '@basenative/config': '^0.2.0',
        express: '^5.1.0',
      },
    }, null, 2) + '\n',
    'server.js': `import express from 'express';
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
    '.env': `PORT=3000
NODE_ENV=development
`,
    '.env.example': `PORT=3000
NODE_ENV=development
`,
    '.gitignore': `node_modules/
dist/
.env.local
.env.*.local
`,
  };
}
