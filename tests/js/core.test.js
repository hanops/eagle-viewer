'use strict';

// Behavior tests for app/web/core.js pure helpers.
// core.js is a classic browser script; we stub the minimal browser globals
// it touches at load time, then require() it like a CommonJS module.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const CORE_PATH = path.join(__dirname, '..', '..', 'app', 'web', 'core.js');

// --- Minimal browser environment stubs -------------------------------

function makeDocument() {
  // div stub that mirrors the browser semantics escapeHtml relies on:
  // setting textContent and reading innerHTML returns HTML-escaped text.
  function makeDiv() {
    let text = '';
    let html = '';
    return {
      set textContent(value) {
        text = String(value);
        html = '';
      },
      get textContent() {
        return text;
      },
      set innerHTML(value) {
        html = String(value);
        text = '';
      },
      get innerHTML() {
        return html || escapeEntities(text);
      },
      dataset: {},
      isConnected: true,
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      getAttribute() {
        return null;
      },
      hasAttribute() {
        return false;
      },
      setAttribute() {},
      removeAttribute() {},
      appendChild() {},
      insertAdjacentHTML() {},
    };
  }

  function escapeEntities(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    createElement(tag) {
      return makeDiv();
    },
    documentElement: {
      setAttribute() {},
      getAttribute() {
        return null;
      },
    },
    getElementById() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    body: makeDiv(),
  };
}

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

const savedGlobals = new Map();
function stubGlobals() {
  // core.js assigns to window.EagleViewer, so window must be the real global object.
  // navigator is read-only in modern Node and already provides .language; leave it.
  const globals = {
    window: globalThis,
    document: makeDocument(),
    localStorage: makeLocalStorage(),
    location: { hash: '', pathname: '/', search: '' },
    history: { state: null, replaceState() {}, pushState() {}, back() {} },
  };
  for (const [name, value] of Object.entries(globals)) {
    savedGlobals.set(name, globalThis[name]);
    try {
      globalThis[name] = value;
    } catch {
      // Read-only global; keep the platform-provided one.
    }
  }
}

function restoreGlobals() {
  for (const [name, value] of savedGlobals) {
    try {
      if (value === undefined) {
        delete globalThis[name];
      } else {
        globalThis[name] = value;
      }
    } catch {
      // Read-only global; nothing to restore.
    }
  }
  savedGlobals.clear();
  // core.js also assigns window.EagleViewer; remove it so later test files
  // requiring core.js start from a clean global object.
  try {
    delete globalThis.EagleViewer;
  } catch {
    // Read-only global; nothing to clean.
  }
}

let core;
test.before(() => {
  stubGlobals();
  delete require.cache[require.resolve(CORE_PATH)];
  core = require(CORE_PATH);
});

test.after(() => {
  restoreGlobals();
});

// --- Behavior tests -------------------------------------------------

test('formatSize renders human-readable sizes', () => {
  assert.strictEqual(core.formatSize(null), '—');
  assert.strictEqual(core.formatSize(0), '—');
  assert.strictEqual(core.formatSize(512), '512 B');
  assert.strictEqual(core.formatSize(1024), '1.0 KB');
  assert.strictEqual(core.formatSize(1536), '1.5 KB');
  assert.strictEqual(core.formatSize(2 * 1024 * 1024), '2.00 MB');
});

test('getItemKind classifies extensions', () => {
  assert.strictEqual(core.getItemKind('JPG'), 'image');
  assert.strictEqual(core.getItemKind('.png'), 'other'); // dotted ext is not matched (callers pass bare ext)
  assert.strictEqual(core.getItemKind('mp4'), 'video');
  assert.strictEqual(core.getItemKind('MP3'), 'audio');
  assert.strictEqual(core.getItemKind('pdf'), 'pdf');
  assert.strictEqual(core.getItemKind('txt'), 'text');
  assert.strictEqual(core.getItemKind('docx'), 'document');
  assert.strictEqual(core.getItemKind('zip'), 'other');
  assert.strictEqual(core.getItemKind(''), 'other');
});

test('isPreviewable / isItemPreviewable / isImageExt / canCopyImage', () => {
  assert.strictEqual(core.isPreviewable('jpg'), true);
  assert.strictEqual(core.isPreviewable('png'), true);
  assert.strictEqual(core.isPreviewable('mp4'), true);
  assert.strictEqual(core.isPreviewable('pdf'), true);
  assert.strictEqual(core.isPreviewable('zip'), false);
  assert.strictEqual(core.isItemPreviewable({ ext: 'gif' }), true);
  assert.strictEqual(core.isItemPreviewable(null), false);
  assert.strictEqual(core.isItemPreviewable({ ext: 'zip' }), false);
  assert.strictEqual(core.isImageExt('webp'), true);
  assert.strictEqual(core.isImageExt('png'), true);
  assert.strictEqual(core.isImageExt('mp4'), false);
  assert.strictEqual(core.canCopyImage('jpg'), true);
  assert.strictEqual(core.canCopyImage('svg'), false); // svg is previewable but not copyable
});

test('escapeHtml escapes markup', () => {
  assert.strictEqual(core.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.strictEqual(core.escapeHtml('a & b "q" \'s\''), 'a &amp; b &quot;q&quot; &#39;s&#39;');
  assert.strictEqual(core.escapeHtml('plain'), 'plain');
});

test('i18n: t and tFmt resolve translations and placeholders', () => {
  core.setLang('zh'); // Node's platform navigator.language may default the module to en
  assert.strictEqual(core.t('sidebar_all'), '全部');
  assert.strictEqual(core.t('no_such_key'), 'no_such_key'); // falls back to key
  assert.strictEqual(core.tFmt('batch_selected', { n: 3 }), '已选 3 个');
  core.setLang('en');
  assert.strictEqual(core.t('sidebar_all'), 'All Items');
  assert.strictEqual(core.tFmt('batch_selected', { n: 2 }), '2 selected');
  core.setLang('fr'); // invalid -> zh
  assert.strictEqual(core.getLang(), 'zh');
  assert.strictEqual(core.t('sidebar_all'), '全部');
  core.setLang('zh');
});

test('getRouteHistoryIdentity builds stable route identity', () => {
  const params = new URLSearchParams();
  params.set('view', 'folder');
  params.set('id', 'abc');
  assert.strictEqual(core.getRouteHistoryIdentity(params), 'folder:abc');
  const recent = new URLSearchParams('view=recent&days=30');
  assert.strictEqual(core.getRouteHistoryIdentity(recent), 'recent:30');
  const search = new URLSearchParams('view=search&q=hello');
  assert.strictEqual(core.getRouteHistoryIdentity(search), 'search:hello');
});

test('applyStateFromHash drives EagleViewer.state', () => {
  const applied = core.applyStateFromHash('#view=folder&id=f1&sort=name&dir=asc&type=image');
  assert.strictEqual(applied, true);
  const state = core.state;
  assert.strictEqual(state.currentView, 'folder');
  assert.strictEqual(state.currentFolderId, 'f1');
  assert.strictEqual(state.listSort, 'name');
  assert.strictEqual(state.listDir, 'asc');
  assert.strictEqual(state.listType, 'image');
  // empty hash is ignored
  assert.strictEqual(core.applyStateFromHash(''), false);
  assert.strictEqual(core.applyStateFromHash(null), false);
});

test('buildListQuery reflects current sort state', () => {
  const state = core.state;
  state.listSort = 'mtime';
  state.listDir = 'desc';
  state.listType = 'all';
  assert.strictEqual(core.buildListQuery(), 'sort=mtime&dir=desc&type=all');
  state.listType = 'video';
  assert.strictEqual(core.buildListQuery(), 'sort=mtime&dir=desc&type=video');
  state.listType = 'all'; // restore shared state for later tests
});
