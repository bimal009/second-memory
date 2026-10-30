const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; vm.runInNewContext(source, { exports }, { filename }); return exports;
}
const { cameraCanRun, shutterIntent } = load('src/features/camera/policy.ts');
const { sessionClock } = load('src/features/session/policy.ts');
const ready = { cameraPage: true, routeFocused: true, foreground: true, overlay: false, dragging: false, session: false, paused: false, previewAvailable: true, settingsReady: true };
test('camera stops for each navigation, privacy, permission, session, and lifecycle interruption', () => {
  assert.equal(cameraCanRun(ready), true);
  for (const key of Object.keys(ready)) {
    assert.equal(cameraCanRun({ ...ready, [key]: !ready[key] }), false, key);
    assert.equal(cameraCanRun(ready), true, `return after ${key}`);
  }
});
test('unfinished hold cannot become an accidental save', () => {
  assert.equal(shutterIntent(80), 'tap'); assert.equal(shutterIntent(179), 'tap');
  assert.equal(shutterIntent(180), 'cancel'); assert.equal(shutterIntent(349), 'cancel');
  assert.equal(shutterIntent(350), 'hold'); assert.equal(shutterIntent(1300), 'hold');
});
test('session chunk, warning and auto-stop boundaries survive a background clock jump', () => {
  assert.equal(sessionClock(0, 59000).finishedChunks, 0);
  assert.equal(sessionClock(0, 60000).finishedChunks, 1);
  assert.equal(sessionClock(0, 2699000).warning, false);
  assert.equal(sessionClock(0, 2700000).warning, true);
  assert.equal(sessionClock(0, 3599000).stop, false);
  const resumed = sessionClock(0, 4000000);
  assert.equal(resumed.seconds, 3600); assert.equal(resumed.finishedChunks, 60); assert.equal(resumed.stop, true);
});
