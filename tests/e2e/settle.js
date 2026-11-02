/**
 * Wait until the page is at rest: fonts loaded, two frames painted, and
 * every finite animation or transition finished. Infinite animations
 * (spinners) are skipped so the wait cannot hang.
 */
export async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let i = 0; i < 5; i++) {
      await frame();
      const pending = document
        .getAnimations()
        .filter(
          (a) =>
            a.playState !== 'finished' && Number.isFinite(a.effect?.getComputedTiming().endTime),
        );
      if (!pending.length) return;
      await Promise.all(pending.map((a) => a.finished.catch(() => {})));
    }
  });
}
