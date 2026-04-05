# @basenative/cli

> The `bn` command-line tool for creating, developing, building, and deploying BaseNative projects.

## Overview

`@basenative/cli` ships the `bn` binary and the `create-basenative` scaffolding command. It covers the full development lifecycle: project creation from templates, local dev server with hot reload, production bundling, component/route/page generation, deployment, environment variable management, and bundle analysis.

## Installation

```bash
npm install -g @basenative/cli
```

Or use without installing via `npx`:

```bash
npx create-basenative my-app
```

## Quick Start

```bash
# Create a new project
bn create my-app

# Create from a template
bn create my-app --template enterprise

# Start the dev server
bn dev

# Start on a custom port
bn dev --port 8080

# Build for production
bn build

# Generate scaffolding
bn generate component Button
bn generate route /dashboard
bn generate page home

# Manage environment variables
bn env set DATABASE_URL postgres://...
bn env list

# Analyze bundle
bn analyze
```

## Commands

### `bn create <name> [options]`

Scaffolds a new BaseNative project.

**Arguments:**
- `name` — project directory name

**Options:**
- `--template <name>` — project template to use (e.g. `enterprise`, `cloudflare-workers`, `node`)

**Example:**
```bash
bn create my-saas --template enterprise
cd my-saas
pnpm install
bn dev
```

---

### `bn dev [options]`

Starts the development server with hot reload.

**Options:**
- `--port <number>` — port to listen on; default `3000`

---

### `bn build`

Bundles the application for production using ESBuild. Output goes to `./dist`.

---

### `bn generate <type> <name>`

Generates scaffolding for components, routes, or pages.

**Types:**
- `component <name>` — generates a semantic HTML component following the Trinity Standard (state + logic + template in one file)
- `route <path>` — generates a route handler (e.g. `bn generate route /users`)
- `page <name>` — generates a full page with SSR template

---

### `bn deploy [options]`

Deploys the application to BaseNative Cloud.

**Options:**
- `--env <name>` — target deployment environment (e.g. `production`, `staging`)

---

### `bn env <subcommand>`

Manages environment variables for the project.

**Subcommands:**
- `bn env set <KEY> <VALUE>` — sets an environment variable
- `bn env get <KEY>` — reads a single variable
- `bn env list` — lists all configured variables
- `bn env delete <KEY>` — removes a variable

---

### `bn analyze`

Analyzes bundle size and reports dependency sizes. Useful for verifying that `@basenative/runtime` stays under the 5KB gzipped budget.

---

### `bn help`

Prints the help message listing all commands.

---

### `bn --version`

Prints the installed CLI version.

## Configuration

The CLI reads `bn.config.js` (or `bn.config.ts`) from the project root when present. See the Getting Started guide for the full config schema.

## Integration

`bn create` sets up a project with the correct `pnpm` workspace layout, `Nx` project config, and Volta Node version pin. The generated `package.json` includes the standard `dev`, `build`, and `test` scripts that map to `bn dev`, `bn build`, and `node --test` respectively.
