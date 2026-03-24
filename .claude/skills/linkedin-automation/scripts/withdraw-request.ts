/**
 * LinkedIn Automation — Withdraw Pending Connection Request
 *
 * Input: { profileUrl: string }
 * Output: { success: boolean, message: string }
 */

import { runScript, getBrowserContext, navigateToProfile, randomDelay, config } from '../lib/browser.js';
import { updateLeadStatus } from '../lib/notion.js';

runScript<{ profileUrl: string }>(async ({ profileUrl }) => {
  if (!profileUrl) return { success: false, message: 'profileUrl is required' };

  const context = await getBrowserContext();
  try {
    const { page, success, error } = await navigateToProfile(context, profileUrl);
    if (!success) return { success: false, message: error || 'Navigation failed' };

    const pendingBtn = page.locator(`${config.selectors.pendingBtn}:visible`).first();
    const isVisible = await pendingBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      return { success: false, message: 'No pending request found for this profile.' };
    }

    await pendingBtn.click();
    await page.waitForTimeout(config.delays.afterClick);

    // Confirm withdrawal in modal
    const withdrawConfirm = page.locator('button[aria-label*="Withdraw"], button:has-text("Withdraw")').first();
    if (await withdrawConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await withdrawConfirm.click();
    }

    await page.waitForTimeout(config.delays.afterClick * 2);
    await randomDelay(1000, 3000);

    try { await updateLeadStatus(profileUrl, 'New'); } catch {}

    const name = await page.locator(config.selectors.profileName).first().textContent().catch(() => '') ?? '';
    return { success: true, message: `Withdrew connection request to ${name.trim() || profileUrl}` };
  } finally {
    await context.close();
  }
});
