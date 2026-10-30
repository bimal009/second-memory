const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function createClient() {
  let state = 'normal'; let preferences = { assistantName: 'Test', appearance: 'system', bufferMinutes: 2 };
  const modules = new Map();
  const stubs = {
    './previewState': { getPreviewState: () => state, mockDelay: async () => { if (state === 'offline' || state === 'error') throw new Error(state); } },
    '@/lib/preferences': { getPreferences: () => preferences, updatePreferences: async patch => { preferences = { ...preferences, ...patch }; } },
  };
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (modules.has(file)) return modules.get(file);
    const exports = {}; modules.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const localRequire = id => stubs[id] ?? load(id.replace('@/', 'src/') + '.ts');
    vm.runInNewContext(source, { exports, require: localRequire, structuredClone, Date, console, setTimeout }, { filename: file });
    return exports;
  }
  return { api: load('src/api/mockClient.ts').mockClient, setState: value => { state = value; } };
}
test('seeded answers cite real moments and passport history is newest first', async () => {
  const { api } = createClient(); const moments = await api.listMemories();
  assert.equal(moments.length, 16);
  const result = await api.ask('Where is my passport?', 'Test');
  assert.equal(result.kind, 'answer'); assert.ok(await api.getMemory(result.answer.citedMemoryId));
  const sightings = await api.getSightings(result.answer.citedMemoryId);
  assert.equal(sightings.length, 2); assert.equal(sightings[0].id, 'memory-passport-drawer');
  assert.notEqual(sightings[0].location.label, sightings[1].location.label);
});
test('delete a citation and asking again yields not-found rather than crashing', async () => {
  const { api } = createClient(); await api.deleteMemory('memory-passport-drawer');
  assert.equal((await api.ask('passport', 'Test')).kind, 'not-found');
});
test('session notes and reminders work without creating a second recorder or extra moment', async () => {
  const { api } = createClient(); const before = (await api.listMemories()).length;
  const command = await api.sendSessionCommand('Review the estimate Friday');
  const session = await api.saveSession(120, [30, 85], false, [command.note]);
  assert.equal((await api.listMemories()).length, before); assert.equal(session.bookmarks.length, 2);
  assert.ok(session.chunks.some(chunk => chunk.text === command.note)); assert.equal(session.localCopyUri, undefined);
  await api.createReminder(session.actionItems[0]); assert.equal((await api.getToday()).reminders.length, 4);
});
test('empty and offline states are supplied by the same swappable API', async () => {
  const { api, setState } = createClient(); setState('empty');
  assert.equal((await api.listMemories()).length, 0); assert.equal((await api.listSessions()).length, 0);
  assert.equal((await api.ask('passport', 'Test')).kind, 'not-found');
  setState('offline'); await assert.rejects(() => api.listMemories(), /offline/);
  setState('normal'); await api.deleteAllMemories();
  assert.equal((await api.listSessions()).length, 0); assert.equal((await api.getToday()).reminders.length, 0);
  assert.equal((await api.ask('passport', 'Test')).kind, 'not-found');
});
