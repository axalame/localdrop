import test from 'node:test';
import assert from 'node:assert/strict';
import { filterHistoryItems } from '../src/utils/filterHistory.ts';

const sampleItems = [
  {
    id: '1',
    item_type: 'clipboard',
    content: 'https://example.com',
    direction: 'win_to_ios',
    timestamp: Date.now(),
    is_favorite: true,
    content_type: 'text',
    tags: ['link'],
    device_name: 'DESKTOP-HIC7',
  },
  {
    id: '2',
    item_type: 'clipboard',
    content: 'const x = 42;\nconsole.log(x);',
    direction: 'ios_to_win',
    timestamp: Date.now() - 3600 * 1000,
    is_favorite: false,
    content_type: 'rich_text',
    tags: ['code'],
    device_name: 'Mi 11',
  },
  {
    id: '3',
    item_type: 'file',
    content: 'photo.png',
    direction: 'ios_to_win',
    timestamp: Date.now() - 86400 * 1000 * 2, // 2 days ago
    is_favorite: true,
    content_type: 'image',
    tags: ['image'],
    device_name: 'Mi 11',
  },
  {
    id: '4',
    item_type: 'file',
    content: 'document.pdf',
    direction: 'win_to_ios',
    timestamp: Date.now() - 86400 * 1000 * 5, // 5 days ago
    is_favorite: false,
    content_type: 'file',
    tags: [],
    device_name: 'DESKTOP-HIC7',
  },
];

test('filterHistoryItems filters favorites correctly', () => {
  const result = filterHistoryItems(sampleItems, {
    category: 'favorites',
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((i) => i.id), ['1', '3']);
});

test('filterHistoryItems filters by type and tag', () => {
  const codeItems = filterHistoryItems(sampleItems, {
    tag: 'code',
  });
  assert.equal(codeItems.length, 1);
  assert.equal(codeItems[0].id, '2');

  const fileItems = filterHistoryItems(sampleItems, {
    type: 'file',
  });
  assert.equal(fileItems.length, 1);
  assert.equal(fileItems[0].id, '4');
});

test('filterHistoryItems filters by device source', () => {
  const miItems = filterHistoryItems(sampleItems, {
    source: 'Mi 11',
  });
  assert.equal(miItems.length, 2);
  assert.deepEqual(miItems.map((i) => i.id), ['2', '3']);
});

test('filterHistoryItems filters by time boundary (today)', () => {
  const todayItems = filterHistoryItems(sampleItems, {
    time: 'today',
  });
  assert.equal(todayItems.length, 2);
  assert.deepEqual(todayItems.map((i) => i.id), ['1', '2']);
});
