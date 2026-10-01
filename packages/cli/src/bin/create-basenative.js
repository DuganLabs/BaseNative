#!/usr/bin/env node
// `create-basenative <name>`: the same scaffolder as `bn create <name>`.
// The bin used to point at commands/create.js, which only exports run(),
// so executing it did nothing and exited 0.
import { run } from '../commands/create.js';

await run(process.argv.slice(2));
