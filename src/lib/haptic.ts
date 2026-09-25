/**
 * Triggers subtle haptic feedback for touch interactions on mobile devices.
 * Uses the standard Vibration API on Android / Chromium and an iOS Safari switch element trigger.
 */
export function triggerHapticFeedback(): void {
  if (typeof window === 'undefined') return;

  // 1. Android / Chrome Vibration API fallback
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(15); // Brief 15ms haptic pulse
    } catch {}
  }

  // 2. iOS Safari Taptic Engine trigger via hidden switch input
  try {
    const el = document.getElementById('ios-haptic-trigger') as HTMLInputElement | null;
    if (el) {
      el.click();
    }
  } catch {}
}
