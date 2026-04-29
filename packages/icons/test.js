import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, 'src');

const EXPECTED_ICONS = ['check', 'chevron-down', 'minus', 'plus', 'remove'];

describe('icon files', () => {
  test('src directory exists', () => {
    assert.ok(existsSync(srcDir));
  });

  test('all expected icons are present', () => {
    for (const name of EXPECTED_ICONS) {
      assert.ok(existsSync(join(srcDir, `${name}.svg`)), `${name}.svg should exist`);
    }
  });

  test('no unexpected files in src', () => {
    const files = readdirSync(srcDir);
    for (const file of files) {
      assert.ok(
        file.endsWith('.svg') || file === 'index.js',
        `unexpected file: ${file}`
      );
    }
  });
});

for (const name of EXPECTED_ICONS) {
  describe(`${name}.svg`, () => {
    const filePath = join(srcDir, `${name}.svg`);
    const content = readFileSync(filePath, 'utf8');

    test('is non-empty', () => {
      assert.ok(content.trim().length > 0);
    });

    test('starts with <svg', () => {
      assert.ok(content.trim().startsWith('<svg'));
    });

    test('has xmlns attribute', () => {
      assert.ok(content.includes('xmlns="http://www.w3.org/2000/svg"'));
    });

    test('has viewBox="0 0 24 24"', () => {
      assert.ok(content.includes('viewBox="0 0 24 24"'), 'should use 24x24 viewBox for consistency');
    });

    test('uses currentColor stroke for theming', () => {
      assert.ok(content.includes('stroke="currentColor"'), 'should use currentColor to inherit theme color');
    });

    test('has fill="none" for outline style', () => {
      assert.ok(content.includes('fill="none"'));
    });

    test('closes </svg> tag', () => {
      assert.ok(content.trim().endsWith('</svg>'));
    });

    test('has stroke-width', () => {
      assert.ok(content.includes('stroke-width='));
    });

    test('has line caps for clean rendering', () => {
      assert.ok(
        content.includes('stroke-linecap="round"'),
        'should use round linecap for clean appearance'
      );
    });

    test('has stroke-linejoin', () => {
      assert.ok(content.includes('stroke-linejoin="round"'));
    });

    test('has width="1em" and height="1em" to prevent FOUC', () => {
      assert.ok(
        content.includes('width="1em"'),
        'icons must declare intrinsic width to size before CSS loads'
      );
      assert.ok(
        content.includes('height="1em"'),
        'icons must declare intrinsic height to size before CSS loads'
      );
    });
  });
}

describe('icon reset stylesheet', () => {
  test('reset.css exists', () => {
    assert.ok(existsSync(join(__dirname, 'reset.css')));
  });

  test('iconResetCss export is a non-empty string', async () => {
    const mod = await import('./src/index.js');
    assert.equal(typeof mod.iconResetCss, 'string');
    assert.ok(mod.iconResetCss.length > 0);
    assert.ok(mod.iconResetCss.includes('1em'));
  });
});

describe('SVG semantic correctness', () => {
  test('check icon contains polyline (checkmark shape)', () => {
    const content = readFileSync(join(srcDir, 'check.svg'), 'utf8');
    assert.ok(content.includes('<polyline'), 'check should use polyline element');
    assert.ok(content.includes('points='), 'polyline should have points');
  });

  test('chevron-down icon contains polyline (arrow shape)', () => {
    const content = readFileSync(join(srcDir, 'chevron-down.svg'), 'utf8');
    assert.ok(content.includes('<polyline'));
  });

  test('minus icon contains a horizontal line', () => {
    const content = readFileSync(join(srcDir, 'minus.svg'), 'utf8');
    assert.ok(content.includes('<line'), 'minus should use line element');
  });

  test('plus icon contains two lines (cross shape)', () => {
    const content = readFileSync(join(srcDir, 'plus.svg'), 'utf8');
    const lines = content.match(/<line/g);
    assert.ok(lines && lines.length === 2, 'plus should have 2 lines');
  });

  test('remove icon contains two diagonal lines (X shape)', () => {
    const content = readFileSync(join(srcDir, 'remove.svg'), 'utf8');
    const lines = content.match(/<line/g);
    assert.ok(lines && lines.length === 2, 'remove/X should have 2 diagonal lines');
  });
});
