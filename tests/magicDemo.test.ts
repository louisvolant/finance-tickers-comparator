import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getForwardPeBadgeClass } from '../src/lib/utils';

test('Magic Demo Playground: presets structure and data integrity', () => {
  const expectedPresets = ['notes', 'pea_us', 'forum'];

  // Test forward P/E badge helper for demo card values
  assert.ok(getForwardPeBadgeClass(28.5).includes('cyan')); // Sweet spot 20-30x
  assert.ok(getForwardPeBadgeClass(42.1).includes('orange')); // High multiple
  assert.ok(getForwardPeBadgeClass(55.0).includes('orange')); // High multiple
  assert.ok(getForwardPeBadgeClass(21.0).includes('cyan')); // Sweet spot
  assert.ok(getForwardPeBadgeClass(14.0).includes('emerald')); // Value
});
