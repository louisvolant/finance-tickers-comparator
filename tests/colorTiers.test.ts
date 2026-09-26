import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getExtendedSessionBadgeClass,
  getForwardPeBadgeClass,
  getForwardPeCardClass,
  getCurrentPeBadgeClass,
  getCurrentPeCardClass,
} from '../src/lib/utils';

describe('Color Tiers & Indicators', () => {
  describe('Extended Session Indicator (Futures / Pre-market / After-hours)', () => {
    test('should return green for positive percentages', () => {
      const cls = getExtendedSessionBadgeClass(0.05);
      assert.ok(cls.includes('emerald'));
    });

    test('should return amber for mild dip between 0% and -0.20%', () => {
      const cls1 = getExtendedSessionBadgeClass(-0.05);
      assert.ok(cls1.includes('amber'));

      const cls2 = getExtendedSessionBadgeClass(-0.19);
      assert.ok(cls2.includes('amber'));
    });

    test('should redden more intensely when below -0.20%', () => {
      const cls1 = getExtendedSessionBadgeClass(-0.25);
      assert.ok(cls1.includes('rose') || cls1.includes('red'));

      const cls2 = getExtendedSessionBadgeClass(-1.20);
      assert.ok(cls2.includes('red') || cls2.includes('rose'));
    });
  });

  describe('Forward P/E Color Tiers', () => {
    test('should return neutral for missing or non-positive P/E', () => {
      assert.ok(getForwardPeBadgeClass(null).includes('slate'));
      assert.ok(getForwardPeBadgeClass(-5).includes('slate'));
      assert.ok(getForwardPeCardClass(null).includes('slate'));
    });

    test('should return green / value style for P/E < 15x', () => {
      const badgeCls = getForwardPeBadgeClass(12);
      assert.ok(badgeCls.includes('emerald'));

      const cardCls = getForwardPeCardClass(12);
      assert.ok(cardCls.includes('emerald'));
    });

    test('should return teal for P/E between 15x and 20x', () => {
      const badgeCls = getForwardPeBadgeClass(17.5);
      assert.ok(badgeCls.includes('teal'));
    });

    test('should identify sweet spot between 20x and 30x with cyan highlight', () => {
      const badgeCls22 = getForwardPeBadgeClass(22);
      assert.ok(badgeCls22.includes('cyan'));

      const badgeCls28 = getForwardPeBadgeClass(28);
      assert.ok(badgeCls28.includes('cyan'));

      const cardCls = getForwardPeCardClass(25);
      assert.ok(cardCls.includes('cyan'));
    });

    test('should progressively redden above 30x (amber -> orange -> deep rose/red)', () => {
      // 30 to 40: amber
      const badge35 = getForwardPeBadgeClass(35);
      assert.ok(badge35.includes('amber'));

      // 40 to 60: orange
      const badge50 = getForwardPeBadgeClass(50);
      assert.ok(badge50.includes('orange'));

      // > 60: deep rose / red
      const badge80 = getForwardPeBadgeClass(80);
      assert.ok(badge80.includes('rose') || badge80.includes('red'));

      const card80 = getForwardPeCardClass(80);
      assert.ok(card80.includes('rose') || card80.includes('red'));
    });
  });

  describe('Current P/E (Trailing) Color Tiers', () => {
    test('should return neutral slate for missing or non-positive P/E', () => {
      assert.ok(getCurrentPeBadgeClass(null).includes('slate'));
      assert.ok(getCurrentPeBadgeClass(undefined).includes('slate'));
      assert.ok(getCurrentPeBadgeClass(0).includes('slate'));
      assert.ok(getCurrentPeBadgeClass(-10).includes('slate'));
      assert.ok(getCurrentPeCardClass(null).includes('slate'));
    });

    test('should return emerald for healthy P/E at or below 20x', () => {
      assert.ok(getCurrentPeBadgeClass(15).includes('emerald'));
      assert.ok(getCurrentPeBadgeClass(20).includes('emerald'));
      assert.ok(getCurrentPeCardClass(18).includes('emerald'));
    });

    test('should return blue for elevated P/E between 20x and 40x', () => {
      assert.ok(getCurrentPeBadgeClass(25).includes('blue'));
      assert.ok(getCurrentPeBadgeClass(40).includes('blue'));
      assert.ok(getCurrentPeCardClass(30).includes('blue'));
    });

    test('should return orange for high P/E between 40x and 60x', () => {
      assert.ok(getCurrentPeBadgeClass(50).includes('orange'));
      assert.ok(getCurrentPeBadgeClass(60).includes('orange'));
      assert.ok(getCurrentPeCardClass(55).includes('orange'));
    });

    test('should return rose/red for very stretched P/E above 60x', () => {
      const badge = getCurrentPeBadgeClass(80);
      assert.ok(badge.includes('rose') || badge.includes('red'));

      const card = getCurrentPeCardClass(100);
      assert.ok(card.includes('rose') || card.includes('red'));
    });
  });
});

