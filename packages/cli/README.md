# @basenative/cli

> The `bn` command-line tool for scaffolding, development, and deployment of BaseNative projects

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install -g @basenative/cli
# or use without installing
npx @basenative/cli create my-app
```

## Quick Start

```bash
# Create a new project
bn create my-app
bn create my-app --template enterprise

# Start development server with hot reload
bn dev
bn dev --port 8080

# Build for production
bn build

# Generate a component, route, or page
bn generate component MyButton
bn generate route /users
bn generate page dashboard

# Manage environment variables
bn env set API_KEY sk-123

# Analyze bundle size and dependencies
bn analyze

# Deploy
bn deploy --env production
```

## Commands

- `bn create <name>` — Scaffolds a new BaseNative project from a template. Templates: `default`, `enterprise`, `cloudflare-workers`.
- `bn dev` — Starts a development server with file watching and hot reload. Options: `--port`.
- `bn build` — Bundles the project for production using ESBuild. Outputs to `dist/`.
- `bn generate <type> <name>` — Generates boilerplate for a component, route, or page in the current project.
- `bn deploy` — Deploys the built project. Options: `--env` (target environment).
- `bn env <subcommand>` — Manages environment variables. Subcommands: `set`, `get`, `list`, `delete`.
- `bn analyze` — Reports bundle size, dependency graph, and dead code.
- `bn help` — Shows help for all commands.

## Options

- `--help`, `-h` — Show help for a command.
- `--version`, `-v` — Print the installed CLI version.

## License

MIT
