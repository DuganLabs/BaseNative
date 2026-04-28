import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPackageCard, packageCardStyles } from './card.js';

describe('renderPackageCard', () => {
  it('renders minimal card with only name', () => {
    const html = renderPackageCard({ name: 'my-component' });
    assert.ok(html.includes('my-component'));
    assert.ok(html.includes('data-bn="pkg-card"'));
    assert.ok(html.includes('data-bn="pkg-name"'));
  });

  it('renders card with description', () => {
    const html = renderPackageCard({
      name: 'button',
      description: 'A reusable button component',
    });
    assert.ok(html.includes('button'));
    assert.ok(html.includes('A reusable button component'));
    assert.ok(html.includes('data-bn="pkg-desc"'));
  });

  it('renders card with category', () => {
    const html = renderPackageCard({
      name: 'table',
      category: 'Data',
    });
    assert.ok(html.includes('Data'));
    assert.ok(html.includes('data-bn="pkg-category"'));
  });

  it('renders card with version', () => {
    const html = renderPackageCard({
      name: 'form',
      version: '1.2.3',
    });
    assert.ok(html.includes('v1.2.3'));
    assert.ok(html.includes('data-bn="pkg-stat"'));
  });

  it('renders card with downloads count', () => {
    const html = renderPackageCard({
      name: 'grid',
      downloads: 5000,
    });
    assert.ok(html.includes('5.0k downloads'));
  });

  it('renders large download count with M suffix', () => {
    const html = renderPackageCard({
      name: 'btn',
      downloads: 2_500_000,
    });
    assert.ok(html.includes('2.5M downloads'));
  });

  it('renders small download count without suffix', () => {
    const html = renderPackageCard({
      name: 'btn',
      downloads: 150,
    });
    assert.ok(html.includes('150 downloads'));
  });

  it('renders download count with k suffix', () => {
    const html = renderPackageCard({
      name: 'btn',
      downloads: 15000,
    });
    assert.ok(html.includes('15.0k downloads'));
  });

  it('renders card with author', () => {
    const html = renderPackageCard({
      name: 'modal',
      author: 'Jane Doe',
    });
    assert.ok(html.includes('Jane Doe'));
    assert.ok(html.includes('data-bn="pkg-author"'));
  });

  it('renders card with multiple tags', () => {
    const html = renderPackageCard({
      name: 'card',
      tags: ['ui', 'reusable', 'accessible'],
    });
    assert.ok(html.includes('data-bn="pkg-tags"'));
    assert.ok(html.includes('ui'));
    assert.ok(html.includes('reusable'));
    assert.ok(html.includes('accessible'));
    assert.ok(html.includes('data-bn="pkg-tag"'));
  });

  it('does not render tags section when tags is empty', () => {
    const html = renderPackageCard({
      name: 'btn',
      tags: [],
    });
    assert.ok(!html.includes('data-bn="pkg-tags"'));
  });

  it('renders card with updatedAt relative time', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const html = renderPackageCard({
      name: 'input',
      updatedAt: yesterday.toISOString(),
    });
    assert.ok(html.includes('yesterday'));
  });

  it('renders updatedAt as today', () => {
    const now = new Date().toISOString();
    const html = renderPackageCard({
      name: 'input',
      updatedAt: now,
    });
    assert.ok(html.includes('today'));
  });

  it('renders updatedAt with days ago format', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - (5 * 86400000));
    const html = renderPackageCard({
      name: 'select',
      updatedAt: fiveDaysAgo.toISOString(),
    });
    assert.ok(html.includes('5d ago'));
  });

  it('renders updatedAt with months ago format', () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - (90 * 86400000));
    const html = renderPackageCard({
      name: 'select',
      updatedAt: threeMonthsAgo.toISOString(),
    });
    assert.ok(html.includes('mo ago'));
  });

  it('renders updatedAt with years ago format', () => {
    const now = new Date();
    const twoYearsAgo = new Date(now.getTime() - (730 * 86400000));
    const html = renderPackageCard({
      name: 'select',
      updatedAt: twoYearsAgo.toISOString(),
    });
    assert.ok(html.includes('y ago'));
  });

  it('renders card with repo URL as link', () => {
    const html = renderPackageCard({
      name: 'link-btn',
      repo: 'https://github.com/user/repo',
    });
    assert.ok(html.includes('href="https://github.com/user/repo"'));
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes('rel="noopener"'));
  });

  it('renders card without repo link when repo is empty', () => {
    const html = renderPackageCard({
      name: 'no-link',
      repo: '',
    });
    assert.ok(!html.includes('href='));
  });

  it('escapes HTML special characters in name', () => {
    const html = renderPackageCard({
      name: '<script>alert("xss")</script>',
    });
    assert.ok(html.includes('&lt;'));
    assert.ok(html.includes('&gt;'));
    assert.ok(!html.includes('<script>'));
  });

  it('escapes HTML special characters in description', () => {
    const html = renderPackageCard({
      name: 'safe',
      description: 'A component with <special> & "characters"',
    });
    assert.ok(html.includes('&lt;'));
    assert.ok(html.includes('&gt;'));
    assert.ok(html.includes('&amp;'));
    assert.ok(html.includes('&quot;'));
  });

  it('escapes HTML special characters in author', () => {
    const html = renderPackageCard({
      name: 'pkg',
      author: 'Author & Co. <team>',
    });
    assert.ok(html.includes('&amp;'));
    assert.ok(html.includes('&lt;'));
  });

  it('escapes HTML special characters in tags', () => {
    const html = renderPackageCard({
      name: 'pkg',
      tags: ['<danger>', 'safe&secure'],
    });
    assert.ok(html.includes('&lt;danger&gt;'));
    assert.ok(html.includes('safe&amp;secure'));
  });

  it('escapes HTML special characters in category', () => {
    const html = renderPackageCard({
      name: 'pkg',
      category: 'UI & Components',
    });
    assert.ok(html.includes('UI &amp; Components'));
  });

  it('escapes HTML special characters in repo URL', () => {
    const html = renderPackageCard({
      name: 'pkg',
      repo: 'https://example.com?a=1&b=2"malicious"',
    });
    assert.ok(html.includes('&quot;'));
  });

  it('renders full card with all fields populated', () => {
    const html = renderPackageCard({
      name: '@basenative/button',
      description: 'A composable button component',
      version: '2.1.0',
      author: 'Team BaseNative',
      category: 'UI',
      tags: ['button', 'interactive', 'accessible'],
      downloads: 125000,
      updatedAt: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
      repo: 'https://github.com/basenative/button',
    });

    assert.ok(html.includes('@basenative/button'));
    assert.ok(html.includes('A composable button component'));
    assert.ok(html.includes('v2.1.0'));
    assert.ok(html.includes('Team BaseNative'));
    assert.ok(html.includes('UI'));
    assert.ok(html.includes('button'));
    assert.ok(html.includes('interactive'));
    assert.ok(html.includes('accessible'));
    assert.ok(html.includes('125.0k downloads'));
    assert.ok(html.includes('mo ago'));
    assert.ok(html.includes('href="https://github.com/basenative/button"'));
  });

  it('renders card with numeric defaults preserved', () => {
    const html = renderPackageCard({
      name: 'test',
      downloads: 0,
    });
    assert.ok(!html.includes('0 downloads'));
  });

  it('handles undefined fields gracefully', () => {
    const html = renderPackageCard({
      name: 'minimal',
      description: undefined,
      author: undefined,
      tags: undefined,
    });
    assert.ok(html.includes('minimal'));
    assert.ok(!html.includes('undefined'));
  });

  it('renders article with correct semantic tag', () => {
    const html = renderPackageCard({ name: 'test' });
    assert.ok(html.includes('<article'));
    assert.ok(html.includes('</article>'));
  });

  it('renders package header with proper structure', () => {
    const html = renderPackageCard({
      name: 'header-test',
      category: 'layout',
    });
    assert.ok(html.includes('data-bn="pkg-header"'));
    assert.ok(html.includes('data-bn="pkg-name"'));
    assert.ok(html.includes('data-bn="pkg-category"'));
  });

  it('renders stats even when individual fields are empty', () => {
    const html = renderPackageCard({
      name: 'stats-test',
      version: '',
      downloads: 0,
    });
    assert.ok(html.includes('data-bn="pkg-stats"'));
  });

  it('does not render download count when zero', () => {
    const html = renderPackageCard({
      name: 'no-downloads',
      downloads: 0,
    });
    // Downloads text should not appear when count is 0
    assert.ok(!html.includes('0 downloads'));
  });

  it('skips description div when empty', () => {
    const html = renderPackageCard({
      name: 'test',
      description: '',
    });
    assert.ok(!html.includes('data-bn="pkg-desc"'));
  });

  it('skips author div when empty', () => {
    const html = renderPackageCard({
      name: 'test',
      author: '',
    });
    assert.ok(!html.includes('data-bn="pkg-author"'));
  });
});

describe('packageCardStyles', () => {
  it('returns CSS string', () => {
    const styles = packageCardStyles();
    assert.strictEqual(typeof styles, 'string');
    assert.ok(styles.length > 0);
  });

  it('includes pkg-card selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-card"]'));
  });

  it('includes pkg-name selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-name"]'));
  });

  it('includes pkg-header selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-header"]'));
  });

  it('includes pkg-category selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-category"]'));
  });

  it('includes pkg-desc selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-desc"]'));
  });

  it('includes pkg-tags selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-tags"]'));
  });

  it('includes pkg-tag selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-tag"]'));
  });

  it('includes pkg-stats selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-stats"]'));
  });

  it('includes download formatting in styles', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-stats"]'));
  });

  it('includes pkg-author selector', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-author"]'));
  });

  it('includes CSS custom properties for theming', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('--surface-2'));
    assert.ok(styles.includes('--border'));
    assert.ok(styles.includes('--accent'));
    assert.ok(styles.includes('--radius-lg'));
  });

  it('includes hover effects for card', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes(':hover'));
  });

  it('includes transition properties', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('transition'));
  });

  it('includes flexbox for layout', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('display: flex'));
  });

  it('includes link styling for pkg-name anchor', () => {
    const styles = packageCardStyles();
    assert.ok(styles.includes('[data-bn="pkg-name"] a'));
    assert.ok(styles.includes('[data-bn="pkg-name"] a:hover'));
  });

  it('returns consistent styles on multiple calls', () => {
    const styles1 = packageCardStyles();
    const styles2 = packageCardStyles();
    assert.strictEqual(styles1, styles2);
  });
});
