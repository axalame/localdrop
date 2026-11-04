import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyContent } from '../src/utils/classification.ts';

test('classifyContent classifies standard text correctly', () => {
  const result = classifyContent('Hello world', 'clipboard');
  assert.equal(result.contentType, 'text');
  assert.deepEqual(result.tags, []);
});

test('classifyContent detects links and adds link tag', () => {
  const result = classifyContent('Visit https://github.com/axalame/localdrop today', 'clipboard');
  assert.equal(result.contentType, 'text');
  assert.ok(result.tags.includes('link'));
});

test('classifyContent detects code snippets and adds code tag', () => {
  const codeSnippet = `function computeHash(data) {\n  const x = 42;\n  return x * 2;\n}`;
  const result = classifyContent(codeSnippet, 'clipboard');
  assert.equal(result.contentType, 'rich_text');
  assert.ok(result.tags.includes('code'));

  const jsonSnippet = `{\n  "name": "LocalDrop",\n  "encrypted": true\n}`;
  const jsonResult = classifyContent(jsonSnippet, 'clipboard');
  assert.ok(jsonResult.tags.includes('code'));
});

test('classifyContent classifies multiline rich text without code', () => {
  const multiline = 'First line\nSecond line\nThird line\nFourth line of notes';
  const result = classifyContent(multiline, 'clipboard');
  assert.equal(result.contentType, 'rich_text');
  assert.equal(result.tags.includes('code'), false);
});

test('classifyContent classifies image files accurately', () => {
  const resultPng = classifyContent('screenshot.png', 'file');
  assert.equal(resultPng.contentType, 'image');
  assert.ok(resultPng.tags.includes('image'));

  const resultJpg = classifyContent('photo.JPG', 'file');
  assert.equal(resultJpg.contentType, 'image');
  assert.ok(resultJpg.tags.includes('image'));
});

test('classifyContent classifies non-image files accurately', () => {
  const resultZip = classifyContent('archive.zip', 'file');
  assert.equal(resultZip.contentType, 'file');
  assert.deepEqual(resultZip.tags, []);

  const resultPdf = classifyContent('manual.pdf', 'file');
  assert.equal(resultPdf.contentType, 'file');
  assert.deepEqual(resultPdf.tags, []);
});
