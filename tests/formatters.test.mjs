import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSize, formatTime, isImageFile, extractFirstUrl } from '../src/utils/formatters.ts';

test('formatSize formats byte sizes accurately', () => {
  assert.equal(formatSize(undefined), '');
  assert.equal(formatSize(0), '0.0 B');
  assert.equal(formatSize(500), '500.0 B');
  assert.equal(formatSize(1024), '1.0 KB');
  assert.equal(formatSize(1024 * 1024), '1.0 MB');
  assert.equal(formatSize(1024 * 1024 * 1024), '1.0 GB');
  assert.equal(formatSize(2.5 * 1024 * 1024), '2.5 MB');
});

test('isImageFile recognizes valid extensions and screenshot prefix', () => {
  assert.equal(isImageFile('photo.png'), true);
  assert.equal(isImageFile('photo.PNG'), true);
  assert.equal(isImageFile('image.jpg'), true);
  assert.equal(isImageFile('image.jpeg'), true);
  assert.equal(isImageFile('icon.svg'), true);
  assert.equal(isImageFile('animation.gif'), true);
  assert.equal(isImageFile('pic.webp'), true);
  assert.equal(isImageFile('screenshot_20261104.bin'), true);

  assert.equal(isImageFile('archive.zip'), false);
  assert.equal(isImageFile('document.pdf'), false);
  assert.equal(isImageFile('script.js'), false);
  assert.equal(isImageFile('plain.txt'), false);
});

test('extractFirstUrl extracts URLs from text correctly', () => {
  assert.equal(extractFirstUrl(undefined), null);
  assert.equal(extractFirstUrl(''), null);
  assert.equal(extractFirstUrl('No link here'), null);
  assert.equal(extractFirstUrl('Check this: https://example.com/foo and enjoy'), 'https://example.com/foo');
  assert.equal(extractFirstUrl('http://192.168.1.100:52025'), 'http://192.168.1.100:52025');
  assert.equal(extractFirstUrl('Multiple https://first.com and http://second.com'), 'https://first.com');
});

test('formatTime produces valid time string', () => {
  const ts = 1700000000000;
  const formatted = formatTime(ts);
  assert.match(formatted, /^\d{2}:\d{2}:\d{2}$/);
});
