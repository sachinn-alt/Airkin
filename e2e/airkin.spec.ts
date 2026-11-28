import { expect, test } from '@playwright/test';

test.describe('AirKin End-to-End Verification', () => {
  test('navigates 3 clean light-theme pages, keeps graph glitch-free, updates simulator, and opens hovering Coach chat', async ({
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
    await expect(page.locator('footer')).toBeVisible();

    // 2. Confirm zero BYOK UI or password inputs exist
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/Connect Gemini Key/i)).toHaveCount(0);

    // 3. Page 1: Live Smog, Interactive Weather Visual Scene & All-India Feed
    await expect(page.getByText(/Gemini Flash Active/i)).toBeVisible();
    await expect(page.getByRole('img', { name: /24 hour PM2\.5 chart/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /Interactive weather and air quality visual/i })).toBeVisible();
    await expect(page.getByText(/All-India Live Weather & Public CPCB AQI Feed \(34 Cities\)/i)).toBeVisible();
    await expect(page.getByRole('img', { name: /Interactive India air quality map/i })).toBeVisible();
    const planCards = page.locator('section[aria-labelledby="ai-plan-heading"] article');
    await expect(planCards).toHaveCount(4);

    // Interactive scene layer buttons work
    await page.getByRole('button', { name: 'Sanctuary', exact: true }).click();
    await expect(page.getByText(/Protected Indoors/i)).toBeVisible();

    // 4. Filter All-India Feed to North & switch to Lucknow, verifying chart stability
    await page.getByRole('button', { name: 'North', exact: true }).click();
    await page.getByRole('button', { name: /^Lucknow/i }).first().click();
    const chartSvg = page.getByRole('img', { name: /24 hour PM2\.5 chart for Lucknow/i });
    await expect(chartSvg).toBeVisible();

    const chartBoxBefore = await page
      .locator('section[aria-label="Current Local Air Quality and Thermal Inversion Status"]')
      .boundingBox();
    const svgBox = await chartSvg.boundingBox();
    if (svgBox) {
      await page.mouse.move(svgBox.x + svgBox.width * 0.5, svgBox.y + svgBox.height * 0.5);
    }
    const chartBoxAfter = await page
      .locator('section[aria-label="Current Local Air Quality and Thermal Inversion Status"]')
      .boundingBox();
    expect(Math.abs((chartBoxAfter?.height ?? 0) - (chartBoxBefore?.height ?? 0))).toBeLessThan(2);

    // 5. Navigate to Page 2: Household & Impact Simulator + Commute Hour Slider
    await page.getByRole('button', { name: /Household & Impact Simulator/i }).click();
    await expect(page.locator('aside[aria-label="Household and Lifestyle Profile"]')).toBeVisible();
    await expect(page.getByText(/Commute & School-Run Hour Exposure/i)).toBeVisible();
    await expect(page.getByText(/Community Multiplier \(25 homes\)/i)).toBeVisible();
    await page.getByRole('button', { name: 'Community', exact: true }).click();
    await expect(page.getByText(/Community Multiplier \(100 homes\)/i)).toBeVisible();

    const countBadge = page.getByText(/\d+ of 8 choices active/i);
    const beforeCountText = await countBadge.innerText();
    await page.getByRole('button', { name: /Organize No-Idling School Zones/i }).click();
    expect(await countBadge.innerText()).not.toBe(beforeCountText);

    // 6. Navigate to Page 3: Community & Guide + Hindi Alert Toggle
    await page.getByRole('button', { name: /Community & Guide/i }).click();
    await expect(page.getByRole('heading', { name: /RWA & School-Group Clean-Air Briefing/i })).toBeVisible();
    await page.getByRole('button', { name: 'हिंदी', exact: true }).click();
    await expect(page.getByText(/मोहल्ला स्वच्छ-हवा अलर्ट/i)).toBeVisible();

    // 7. Open Hovering Ask AirKin Coach button & run live Gemini chat
    await page.getByRole('button', { name: /Open Ask AirKin Coach/i }).click();
    await expect(page.getByRole('heading', { name: /Ask AirKin Coach \(Lucknow\)/i })).toBeVisible();
    const chatInput = page.getByLabel('Ask AirKin a question');
    await chatInput.fill('What is the best time to air out my home today?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect(page.getByRole('dialog')).toContainText(
      /14:00|15:00|16:00|afternoon|window|PM2\.5/i,
      { timeout: 25_000 }
    );

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
