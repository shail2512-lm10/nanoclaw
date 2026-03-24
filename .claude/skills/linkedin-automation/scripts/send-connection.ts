/**
 * LinkedIn Automation — Send Connection Request
 *
 * Input: { profileUrl: string, note?: string }
 * Output: { success: boolean, message: string }
 */

import {
  runScript, getBrowserContext, navigateToProfile,
  incrementCount, checkLimit, loadDailyCounts, randomDelay, config
} from '../lib/browser.js';
import { updateLeadStatus } from '../lib/notion.js';

runScript<{ profileUrl: string; note?: string }>(async ({ profileUrl, note }) => {
  if (!profileUrl) return { success: false, message: 'profileUrl is required' };

  if (!checkLimit('connections', 'maxConnectionsPerDay')) {
    const counts = loadDailyCounts();
    return { success: false, message: `Daily connection limit reached (${counts.connections}/${config.limits.maxConnectionsPerDay})` };
  }

  const context = await getBrowserContext();
  try {
    const { page, success, error } = await navigateToProfile(context, profileUrl);
    if (!success) return { success: false, message: error || 'Navigation failed' };

    // Click Connect button — use :visible to skip hidden DOM duplicates
    const connectBtn = page.locator(`${config.selectors.connectBtn}:visible`).first();
    const isVisible = await connectBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      // May be inside the "More" menu
      const moreBtn = page.locator('button:visible[aria-label*="More actions"]').first();
      if (await moreBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await moreBtn.click();
        await page.waitForTimeout(config.delays.afterClick);
        const menuConnect = page.locator('div[aria-label*="connect" i]').first();
        if (await menuConnect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await menuConnect.click();
        } else {
          return { success: false, message: 'Connect button not found. May already be connected or restricted.' };
        }
      } else {
        return { success: false, message: 'Connect button not found. Already connected or profile is restricted.' };
      }
    } else {
      await connectBtn.click();
    }

    await page.waitForTimeout(config.delays.afterClick);

    if (note && note.trim()) {
      // Add personalized note
      const addNoteBtn = page.locator(config.selectors.addNoteBtn).first();
      if (await addNoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addNoteBtn.click();
        await page.waitForTimeout(config.delays.afterClick);
        await page.fill(config.selectors.noteTextarea, note.trim().slice(0, 300));
        await page.waitForTimeout(config.delays.afterType);
        // "Send invitation" only appears after clicking "Add a note"
        await page.locator(config.selectors.sendNowBtn).first().click();
      } else {
        // "Add a note" unavailable — send without note
        await page.locator(config.selectors.sendWithoutNoteBtn).first().click();
      }
    } else {
      await page.locator(config.selectors.sendWithoutNoteBtn).first().click();
    }

    await page.waitForTimeout(config.delays.afterClick * 2);
    await randomDelay(2000, 4000);

    incrementCount('connections');

    try {
      await updateLeadStatus(profileUrl, 'Requested');
    } catch {}

    const profileName = await page.locator(config.selectors.profileName).first().textContent().catch(() => '') ?? '';
    return {
      success: true,
      message: `Connection request sent to ${profileName.trim() || profileUrl}${note ? ' with a personalized note' : ''}`,
    };
  } finally {
    await context.close();
  }
});
