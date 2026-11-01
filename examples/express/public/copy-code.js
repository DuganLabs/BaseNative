/**
 * Copy buttons on code blocks. The button ships hidden, since without
 * script it can do nothing; this reveals it and copies its block's code.
 */
for (const button of document.querySelectorAll('figure[variant="code"] > figcaption > button[data-bn-copy]')) {
  const label = button.textContent;
  button.hidden = false;
  button.addEventListener('click', async () => {
    const code = button.closest('figure').querySelector('pre').textContent;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press ⌘C';
      getSelection().selectAllChildren(button.closest('figure').querySelector('pre'));
    }
    setTimeout(() => (button.textContent = label), 1600);
  });
}
