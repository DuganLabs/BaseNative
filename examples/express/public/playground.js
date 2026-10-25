/**
 * /playground — the client controller.
 *
 * The page's chrome is server-rendered from @basenative/components
 * (toolbar, select, buttons, tabs, list-group); this script wires it:
 * the editors (textarea over a highlight layer, one scroll container
 * per pane, axis-locked gestures), the example picker, and the run
 * loop. Running means posting the three panes to the preview document
 * at /playground/preview — a real route that loads the site's own
 * runtime bundle by absolute path — and collecting its console,
 * errors and BN_ diagnostics into the JS pane's console. Nothing is
 * saved anywhere; a reload resets the page.
 */
'use strict';

/* ================= examples ================= */
const EXAMPLES = JSON.parse(document.getElementById('playground-examples').textContent);

/* ================= syntax highlighting =================
   The implementation lives in highlight-engine.js, shared with the
   site's server-side pass — see that module. This file is a module so
   the import below is static: the editors never render unhighlighted
   first and re-render when a copy of the engine arrives. */
import { HIGHLIGHTERS } from '/highlight-engine.js';

/* ================= axis-locked scrolling ================= */
/* A scroll gesture in an editor pane moves along ONE axis only. The
   handler takes the gesture over from its first move: deltas are
   buffered until one axis passes a small threshold, that axis owns the
   gesture until the finger lifts, and the pane's scroll position is
   driven along it directly — the pane stays the single scroll
   container, so the gutter pinning is untouched. A flick keeps a
   decaying momentum fling along the locked axis; positions clamp at
   the edges. Wheel and trackpad input groups into gestures the same
   way: once a gesture's dominant axis is known, the other axis's delta
   is dropped for the rest of that gesture. */
function attachAxisLock(el) {
  const THRESHOLD = 7;
  let touch = null;
  let raf = 0;

  function point(e) {
    return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
  }
  function setPos(axis, pos) {
    const max = axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    pos = Math.max(0, Math.min(Math.max(max, 0), pos));
    if (axis === 'x') el.scrollLeft = pos;
    else el.scrollTop = pos;
  }
  function stopFling() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function fling(axis, v) {
    stopFling();
    v = Math.max(-4, Math.min(4, v));
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      const pos = (axis === 'x' ? el.scrollLeft : el.scrollTop) + v * dt;
      v *= Math.exp(-dt / 240);
      setPos(axis, pos);
      const actual = axis === 'x' ? el.scrollLeft : el.scrollTop;
      if (Math.abs(v) < 0.02 || Math.abs(actual - pos) > 0.5) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  el.addEventListener(
    'touchstart',
    (e) => {
      stopFling();
      if (!e.touches || e.touches.length !== 1) {
        touch = null;
        return;
      }
      const p = point(e);
      touch = {
        x: p.clientX,
        y: p.clientY,
        lastX: p.clientX,
        lastY: p.clientY,
        lastTime: performance.now(),
        l: el.scrollLeft,
        t: el.scrollTop,
        axis: null,
        vx: 0,
        vy: 0,
      };
    },
    { passive: true },
  );

  el.addEventListener(
    'touchmove',
    (e) => {
      if (!touch) return;
      e.preventDefault();
      const p = point(e);
      const now = performance.now();
      const dt = now - touch.lastTime;
      if (dt > 0) {
        touch.vx = 0.7 * touch.vx + 0.3 * ((touch.lastX - p.clientX) / dt);
        touch.vy = 0.7 * touch.vy + 0.3 * ((touch.lastY - p.clientY) / dt);
      }
      touch.lastX = p.clientX;
      touch.lastY = p.clientY;
      touch.lastTime = now;
      const dx = touch.x - p.clientX;
      const dy = touch.y - p.clientY;
      if (!touch.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return;
        touch.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      if (touch.axis === 'x') {
        setPos('x', touch.l + dx);
        el.scrollTop = touch.t;
      } else {
        setPos('y', touch.t + dy);
        el.scrollLeft = touch.l;
      }
    },
    { passive: false },
  );

  function endTouch() {
    if (!touch) return;
    const g = touch;
    touch = null;
    if (!g.axis) return;
    if (performance.now() - g.lastTime > 60) return;
    const v = g.axis === 'x' ? g.vx : g.vy;
    if (Math.abs(v) > 0.08) fling(g.axis, v);
  }
  el.addEventListener('touchend', endTouch);
  el.addEventListener('touchcancel', () => {
    touch = null;
  });

  let wheel = null;
  el.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return; /* trackpad pinch: leave zoom alone */
      e.preventDefault();
      stopFling();
      let dx = e.deltaX || 0;
      let dy = e.deltaY || 0;
      const mode = e.deltaMode || 0;
      if (mode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (mode === 2) {
        dx *= el.clientWidth;
        dy *= el.clientHeight;
      }
      if (!wheel) wheel = { axis: null, bx: 0, by: 0, timer: 0 };
      clearTimeout(wheel.timer);
      wheel.timer = setTimeout(() => {
        wheel = null;
      }, 160);
      if (!wheel.axis) {
        wheel.bx += dx;
        wheel.by += dy;
        if (Math.max(Math.abs(wheel.bx), Math.abs(wheel.by)) < 3) return;
        wheel.axis = Math.abs(wheel.bx) >= Math.abs(wheel.by) ? 'x' : 'y';
        dx = wheel.bx;
        dy = wheel.by;
      }
      if (wheel.axis === 'x') setPos('x', el.scrollLeft + dx);
      else setPos('y', el.scrollTop + dy);
    },
    { passive: false },
  );
}

/* ================= editors ================= */
const editors = {};
for (const lang of ['html', 'css', 'js']) {
  const pane = document.querySelector('[data-pane="' + lang + '"]');
  const ta = pane.querySelector('textarea');
  const code = pane.querySelector('.hl code');
  const hl = pane.querySelector('.hl');
  const gutter = pane.querySelector('.gutter');
  const editorEl = pane.querySelector('.editor');
  const sheet = pane.querySelector('.sheet');
  let lastLines = 0;

  function refresh() {
    code.innerHTML = HIGHLIGHTERS[lang](ta.value) + '\n';
    const lines = ta.value.split('\n').length;
    if (lines !== lastLines) {
      lastLines = lines;
      let nums = '';
      for (let i = 1; i <= lines; i++) nums += i + (i < lines ? '\n' : '');
      gutter.textContent = nums;
    }
    sizeSheet();
  }
  /* The sheet is absolutely positioned and takes the code's own size
     (never less than the editor's box), so the .editor section — not
     the textarea — is what scrolls, and the sheet's size never feeds
     back into the pane's height. A hidden panel measures 0; it is
     re-measured when its tab is selected and on resize. */
  function sizeSheet() {
    const baseW = editorEl.clientWidth;
    const baseH = editorEl.clientHeight;
    if (!baseW || !baseH) return;
    sheet.style.width = baseW + 'px';
    sheet.style.height = baseH + 'px';
    const w = Math.max(baseW, hl.scrollWidth);
    const h = Math.max(baseH, hl.scrollHeight);
    sheet.style.width = w + 'px';
    sheet.style.height = h + 'px';
    gutter.style.height = h + 'px';
  }
  function pinGutter() {
    gutter.style.transform = 'translateX(' + editorEl.scrollLeft + 'px)';
  }
  ta.addEventListener('input', () => {
    refresh();
    scheduleRun();
  });
  editorEl.addEventListener('scroll', pinGutter);
  attachAxisLock(editorEl);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
      refresh();
      scheduleRun();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });
  editors[lang] = {
    get: () => ta.value,
    set: (v) => {
      ta.value = v;
      editorEl.scrollTop = 0;
      editorEl.scrollLeft = 0;
      refresh();
    },
    refresh,
  };
  refresh();
}
window.addEventListener('resize', () => {
  for (const lang in editors) editors[lang].refresh();
});

/* ================= editor tabs ================= */
/* The tabs component rendered the tab list and panels server-side;
   this supplies the APG behaviour on the client, the same way
   compare.js activates renderTabs() output. Wide screens show all
   three panels and hide the tab list (see playground.css). */
const tabsRoot = document.querySelector('section[variant="tabs"]');
const tabButtons = [...tabsRoot.querySelectorAll('[role="tab"]')];
const tabPanels = [...tabsRoot.querySelectorAll('[role="tabpanel"]')];

function selectTab(tab) {
  for (const other of tabButtons) {
    const selected = other === tab;
    other.setAttribute('aria-selected', String(selected));
    other.tabIndex = selected ? 0 : -1;
  }
  for (const panel of tabPanels) {
    panel.hidden = panel.getAttribute('aria-labelledby') !== tab.id;
  }
  /* A panel that was hidden measured a 0-size sheet; size it now. */
  for (const lang in editors) editors[lang].refresh();
}
function moveTab(from, delta) {
  const next =
    tabButtons[(tabButtons.indexOf(from) + delta + tabButtons.length) % tabButtons.length];
  next.focus();
  selectTab(next);
}
for (const tab of tabButtons) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const keys = {
      ArrowRight: () => moveTab(tab, 1),
      ArrowLeft: () => moveTab(tab, -1),
      Home: () => {
        tabButtons[0].focus();
        selectTab(tabButtons[0]);
      },
      End: () => {
        tabButtons[tabButtons.length - 1].focus();
        selectTab(tabButtons[tabButtons.length - 1]);
      },
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  });
}

/* ================= console (list-group in the JS pane) ================= */
const consoleList = document.getElementById('consoleList');
const consoleEmpty = document.getElementById('consoleEmpty');
let consoleCount = 0;

function addConsole(level, tag, text) {
  if (consoleCount === 0) consoleEmpty.style.display = 'none';
  consoleCount++;
  if (consoleCount > 120) {
    const first = consoleList.firstElementChild;
    if (first) first.remove();
  }
  /* One list-group item: the level tag and the message are the item's
     content, and the tone rides on the row for its colour. */
  const li = document.createElement('li');
  if (level) li.setAttribute('data-tone', level);
  const lvl = document.createElement('b');
  lvl.className = 'lvl';
  lvl.textContent = tag;
  const msg = document.createElement('span');
  msg.className = 'msg';
  msg.textContent = text;
  li.appendChild(lvl);
  li.appendChild(msg);
  consoleList.appendChild(li);
  li.scrollIntoView({ block: 'nearest' });
}
function clearConsole() {
  consoleList.textContent = '';
  consoleCount = 0;
  consoleEmpty.style.display = '';
}

/* ================= run loop ================= */
const preview = document.getElementById('preview');
const runStatus = document.getElementById('runStatus');
let previewReady = false;
let runHadError = false;

function run() {
  if (!previewReady || !preview.contentWindow) return;
  runHadError = false;
  clearConsole();
  runStatus.classList.remove('bad');
  runStatus.textContent = 'Running…';
  preview.contentWindow.postMessage(
    {
      source: 'bn-playground-host',
      type: 'run',
      payload: { html: editors.html.get(), css: editors.css.get(), js: editors.js.get() },
    },
    window.location.origin,
  );
}

window.addEventListener('message', (e) => {
  if (e.source !== preview.contentWindow) return;
  const d = e.data;
  if (!d || d.source !== 'bn-playground') return;
  const p = d.payload || {};
  if (d.type === 'ready') {
    previewReady = true;
    run();
  } else if (d.type === 'console') {
    const tag = p.level === 'log' ? 'LOG' : p.level.toUpperCase();
    addConsole(
      p.level === 'log' || p.level === 'debug' ? '' : p.level,
      tag,
      (p.args || []).join(' '),
    );
    if (p.level === 'error') runHadError = true;
  } else if (d.type === 'error') {
    runHadError = true;
    addConsole('error', 'ERROR', p.message || 'Unknown error');
  } else if (d.type === 'diagnostic') {
    if (p.level === 'error') runHadError = true;
    const text =
      p.code +
      (p.message ? ' — ' + p.message : '') +
      (p.expression ? '  [in: ' + p.expression + ']' : '');
    addConsole('diag', 'BN', text);
  } else if (d.type === 'done') {
    const ok = p.ok && !runHadError;
    runStatus.classList.toggle('bad', !ok);
    runStatus.textContent =
      (ok ? 'Rendered · ' : 'Finished with errors · ') +
      new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }
});

let runTimer = null;
function scheduleRun() {
  if (runTimer) clearTimeout(runTimer);
  runTimer = setTimeout(run, 650);
}
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    run();
  }
});

/* ================= toolbar + console controls ================= */
let currentExample = EXAMPLES[0];
function loadExample(ex) {
  currentExample = ex;
  editors.html.set(ex.html);
  editors.css.set(ex.css);
  editors.js.set(ex.js);
  run();
}

const exampleSelect = document.getElementById('exampleSelect');
exampleSelect.addEventListener('change', () => {
  const ex = EXAMPLES.find((x) => x.id === exampleSelect.value);
  if (ex) loadExample(ex);
});

const toolbarEl = document.querySelector('section[variant="toolbar"]');
toolbarEl.querySelector('button[variant="default"]').addEventListener('click', () => {
  loadExample(currentExample);
});
toolbarEl.querySelector('button[variant="primary"]').addEventListener('click', () => {
  run();
});
document.querySelector('.console-head button[variant="ghost"]').addEventListener('click', () => {
  clearConsole();
});

loadExample(EXAMPLES[0]);
