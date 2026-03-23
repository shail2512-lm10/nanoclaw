/**
 * LinkedIn Automation — Follow a Person or Company
 *
 * Input: { profileUrl: string }
 * Output: { success: boolean, message: string }
 */

import {
  runScript, getBrowserContext, navigateToProfile,
  incrementCount, checkLimit, loadDailyCounts, randomDelay, config
} from '../lib/browser.js';

runScript<{ profileUrl: string }>(async ({ profileUrl }) => {
  if (!profileUrl) return { success: false, message: 'profileUrl is required' };

  if (!checkLimit('follows', 'maxFollowsPerDay')) {
    const counts = loadDailyCounts();
    return { success: false, message: `Daily follow limit reached (${counts.follows}/${config.limits.maxFollowsPerDay})` };
  }

  const context = await getBrowserContext();
  try {
    const { page, success, error } = await navigateToProfile(context, profileUrl);
    if (!success) return { success: false, message: error || 'Navigation failed' };

    const followBtn = page.locator(config.selectors.followBtn).first();
    const isVisible = await followBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      // Try "More" menu
      const moreBtn = page.locator('button[aria-label*="More actions"]').first();
      if (await moreBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await moreBtn.click();
        await page.waitForTimeout(config.delays.afterClick);
        const menuFollow = page.locator('div[aria-label*="Follow"]').first();
        if (await menuFollow.isVisible({ timeout: 3000 }).catch(() => false)) {
          await menuFollow.click();
        } else {
          return { success: false, message: 'Follow option not found in menu.' };
        }
      } else {
        return { success: false, message: 'Follow button not found. May already be following.' };
      }
    } else {
      await followBtn.click();
    }

    await page.waitForTimeout(config.delays.afterClick * 2);
    await randomDelay(1500, 4000);
    incrementCount('follows');

    const name = await page.locator(config.selectors.profileName).first().textContent().catch(() => '') ?? '';
    return { success: true, message: `Now following ${name.trim() || profileUrl}` };
  } finally {
    await context.close();
  }
});
