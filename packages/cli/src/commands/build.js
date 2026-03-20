import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { parseArgs } from 'node:util';

export async function run(args) {
  const { values } = parseArgs({
    args,
    options: {
      outdir: { type: 'string', short: 'o', default: 'dist' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
  bn build [options]

  Build for production.

  Options:
    --outdir, -o   Output directory [default: dist]
    --help, -h     Show this help
`);
    return;
  }

  const cwd = process.cwd();
  const outDir = resolve(cwd, values.outdir);

  console.log(`Building to ${relative(cwd, outDir) || outDir}`);
  mkdirSync(outDir, { recursive: true });

  // Copy server files
  const serverFiles = ['server.js', 'src/server.js', 'index.js'];
  for (const file of serverFiles) {
    if (existsSync(resolve(cwd, file))) {
      const dest = join(outDir, file);
      mkdirSync(join(dest, '..'), { recursive: true });
      copyFileSync(resolve(cwd, file), dest);
      console.log(`  Copied ${file}`);
    }
  }

  // Copy views directory
  if (existsSync(resolve(cwd, 'views'))) {
    copyDirSync(resolve(cwd, 'views'), join(outDir, 'views'));
    console.log('  Copied views/');
  }

  // Copy public directory
  if (existsSync(resolve(cwd, 'public'))) {
    copyDirSync(resolve(cwd, 'public'), join(outDir, 'public'));
    console.log('  Copied public/');
  }

  // Copy package.json
  if (existsSync(resolve(cwd, 'package.json'))) {
    copyFileSync(resolve(cwd, 'package.json'), join(outDir, 'package.json'));
    console.log('  Copied package.json');
  }

  console.log('\nBuild complete.');
}

function copyDirSync(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
