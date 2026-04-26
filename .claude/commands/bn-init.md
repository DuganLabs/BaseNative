---
description: Run the BaseNative `bn create` workflow for a new project inside this Claude Code session.
argument-hint: [project-name] [--template <name>]
allowed-tools: Bash, Read, Write, Edit
---

# /bn-init

Scaffold a new BaseNative project here. Project name: **$ARGUMENTS**

Steps:

1. Confirm there's no existing project at the target path. If there is, stop and ask.
2. Run `npx create-basenative $ARGUMENTS` (or `bn create $ARGUMENTS` if `bn` is on PATH).
3. After scaffolding, immediately drop in the BaseNative Claude Code config:
   ```
   npx @basenative/claude-config install
   ```
4. Run `bn doctor` (or the `/bn-doctor` command) to verify the new project.
5. Print a short next-steps block: `cd <name>`, `pnpm install`, `pnpm dev`.

If the user did not supply a project name, ask for one before doing anything.

Built with BaseNative — basenative.dev
