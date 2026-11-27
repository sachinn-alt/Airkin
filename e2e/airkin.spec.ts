import { expect, test } from '@playwright/test';

test.describe('AirKin End-to-End Verification', () => {
  test('renders live dashboard, avoids BYOK, updates simulator, switches city, and completes live Gemini chat', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Core accessibility landmarks & AirKin branding
    await expect(page.getByRole('heading', { name: 'AirKin', level: 1 })).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main#main-dashboard')).toBeVisible();
    await expect(page.locator('aside[aria-label="Household and Lifestyle Profile"]')).toBeVisible();

    // 2. Confirm zero BYOK UI or password inputs exist
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/Connect Gemini Key/i)).toHaveCount(0);

    // 3. Confirm server Gemini status & initial live AQI / 24h Smog Chart
    await expect(page.getByText(/Gemini Flash Active/i)).toBeVisible();
    await expect(page.getByRole('img', { name: /24 hour PM2\.5 chart/i })).toBeVisible();

    // 4. Confirm 4-pillar Gemini tailored plan cards rendered
    const planCards = page.locator('section[aria-labelledby="ai-plan-heading"] article');
    await expect(planCards).toHaveCount(4);

    // 5. Switch to Delhi hotspot and verify live update
    await page.getByRole('button', { name: 'Delhi', exact: true }).click();
    await expect(page.getByRole('img', { name: /24 hour PM2\.5 chart for Delhi/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ask AirKin Coach \(Delhi\)/i })).toBeVisible();

    // 6. Verify Community Mode multiplier switches from 25 homes -> 100 homes
    await expect(page.getByText(/Community Multiplier \(25 homes\)/i)).toBeVisible();
    await page.getByRole('button', { name: 'Community', exact: true }).click();
    await expect(page.getByText(/Community Multiplier \(100 homes\)/i)).toBeVisible();

    // 7. Toggle an action in the Interactive Choice & Direct Impact Simulator
    const countBadge = page.getByText(/\d+ of 8 choices active/i);
    const beforeCountText = await countBadge.innerText();
    await page
      .getByRole('button', { name: /Organize No-Idling School Zones/i })
      .click();
    const afterCountText = await countBadge.innerText();
    expect(afterCountText).not.toBe(beforeCountText);

    // 8. Send a real chat question to Gemini coach and verify response
    const chatInput = page.getByLabel('Ask AirKin a question');
    await chatInput.fill('What is the best time to air out my home today?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect(page.locator('section[aria-labelledby="advisor-chat-heading"]')).toContainText(
      /14:00|15:00|16:00|afternoon|window|PM2\.5/i,
      { timeout: 25_000 }
    );

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
