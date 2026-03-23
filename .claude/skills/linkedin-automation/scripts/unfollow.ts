/**
 * LinkedIn Automation — Unfollow a Person or Company
 *
 * Input: { profileUrl: string }
 * Output: { success: boolean, message: string }
 */

import { runScript, getBrowserContext, navigateToProfile, randomDelay, config } from '../lib/browser.js';

runScript<{ profileUrl: string }>(async ({ profileUrl }) => {
  if (!profileUrl) return { success: false, message: 'profileUrl is required' };

  const context = await getBrowserContext();
  try {
    const { page, success, error } = await navigateToProfile(context, profileUrl);
    if (!success) return { success: false, message: error || 'Navigation failed' };

    const unfollowBtn = page.locator(config.selectors.unfollowBtn).first();
    const isVisible = await unfollowBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      return { success: false, message: 'Unfollow button not found. May not be following this person.' };
    }

    await unfollowBtn.click();
    await page.waitForTimeout(config.delays.afterClick);

    // Confirm if dialog appears
    const confirmBtn = page.locator('button:has-text("Unfollow")').last();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await page.waitForTimeout(config.delays.afterClick * 2);
    await randomDelay(1000, 3000);

    const name = await page.locator(config.selectors.profileName).first().textContent().catch(() => '') ?? '';
    return { success: true, message: `Unfollowed ${name.trim() || profileUrl}` };
  } finally {
    await context.close();
  }
});
