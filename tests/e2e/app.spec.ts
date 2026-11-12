import { test, expect, type Page } from '@playwright/test';

async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
}
test('overview loads real capabilities, saves a snapshot, and persists appearance', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const external: string[] = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5000') && !request.url().startsWith('data:')) external.push(request.url()); });
  await open(page);
  await expect(page).toHaveTitle('Veylo · Overview');
  await expect(page.getByText('The essentials', { exact: true })).toBeVisible();
  await expect(page.getByText('CPU utilization is not exposed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save snapshot', exact: true }).click();
  await expect(page.getByText('Device snapshot saved to your reports.')).toBeVisible();
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('link', { name: /Open Device snapshot/ })).toBeVisible();
  await page.reload(); await expect(page.getByRole('link', { name: /Open Device snapshot/ })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark appearance' }).click();
  await page.reload(); await expect(page.getByRole('button', { name: 'Switch to light appearance' })).toBeVisible();
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
test('all workspace destinations and specification search work', async ({ page }) => {
  await open(page);
  for (const [name, title] of [['Activity', 'Activity'], ['Benchmarks', 'Benchmarks'], ['Device', 'Your device'], ['Reports', 'Your reports']] as const) {
    await page.getByRole('link', { name, exact: true }).click(); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Device', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search device specifications' }).fill('battery');
  await expect(page.getByText('Battery charge', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Logical processors', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search device specifications' }).fill('nothing-matches-this');
  await expect(page.getByText('No matching details', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Read motion', exact: true }).click();
  await expect(page.getByText(/Motion access was not granted|No motion sample|motion events|does not expose|No accelerometer|Live motion sample/).first()).toBeVisible({ timeout: 12000 });
});
test('compute and memory checks complete, save, and cancellation stays partial', async ({ page }) => {
  await open(page, '/stress');
  const compute = page.getByTestId('benchmark-compute'); const memory = page.getByTestId('benchmark-memory');
  await compute.getByRole('radio', { name: '5 seconds', exact: true }).click();
  await compute.getByRole('button', { name: 'Run compute check' }).click();
  await expect(memory.getByRole('button', { name: 'Run memory check' })).toBeDisabled();
  await expect(compute.getByText('Completed', { exact: true })).toBeVisible({ timeout: 12000 });
  await expect(compute.getByText(/ops \/ sec/)).toBeVisible();
  await memory.getByRole('radio', { name: '5 seconds', exact: true }).click();
  await memory.getByRole('button', { name: 'Run memory check' }).click();
  await expect(memory.getByText('Completed', { exact: true })).toBeVisible({ timeout: 12000 });
  await expect(memory.getByText('All sampled writes verified', { exact: true })).toBeVisible();
  await compute.getByRole('button', { name: 'Run compute again' }).click();
  await compute.getByRole('button', { name: 'Stop check' }).click();
  await expect(compute.getByText('Stopped early', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('link', { name: /Open Compute check/ })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Open Memory check/ })).toHaveCount(1);
});
test('report JSON and CSV downloads, detail view, and confirmed deletion work', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Save snapshot', exact: true }).click();
  await expect(page.getByText('Device snapshot saved to your reports.')).toBeVisible();
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toMatch(/^veylo-reports-.*\.json$/);
  const stream = await download.createReadStream(); let json = ''; for await (const chunk of stream!) json += chunk.toString();
  expect(JSON.parse(json).reports[0].kind).toBe('snapshot');
  const csvEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV', exact: true }).click(); expect((await csvEvent).suggestedFilename()).toMatch(/\.csv$/);
  await page.getByRole('link', { name: /Open Device snapshot/ }).click();
  await expect(page.getByRole('heading', { name: 'The captured readings' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete report', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete report', exact: true }).click();
  await expect(page.getByRole('link', { name: /Open Device snapshot/ })).toHaveCount(0);
  await expect(page.getByText('Your story starts with a check-in', { exact: true }).filter({ visible: true })).toBeVisible();
});
test('activity pauses, exports actual samples, and clears only session data', async ({ page }) => {
  await open(page, '/monitor');
  await expect(page.getByText(/[1-9]\d* samples in this window/)).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Pause session' }).click(); await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export session' }).click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toMatch(/^veylo-session-.*\.csv$/);
  await page.getByRole('radio', { name: 'Battery charge', exact: true }).click();
  await page.getByRole('button', { name: 'Clear session', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear session', exact: true }).click();
  await expect(page.getByText('0 samples in this window', { exact: true })).toBeVisible();
});
test('settings persist, auto-save can be disabled, and clear requires confirmation', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Save snapshot', exact: true }).click();
  await expect(page.getByText('Device snapshot saved to your reports.')).toBeVisible();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByRole('radio', { name: 'Dark', exact: true }).click();
  await page.getByRole('switch', { name: 'Automatically save completed checks' }).uncheck();
  await page.reload(); await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Automatically save completed checks' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Clear reports', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('veylo:reports:v1') || '[]').length)).toBe(1);
  await page.getByRole('button', { name: 'Clear reports', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear all reports', exact: true }).click();
  await expect(page.getByText('All local reports have been cleared.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('veylo:reports:v1'))).toBeNull();
});
test('mobile navigation fits the viewport and settings remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const name of ['Activity', 'Benchmarks', 'Device', 'Reports', 'Overview']) {
    await page.getByRole('link', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Open settings' }).click(); await expect(page.getByRole('heading', { name: 'Make yourself at home' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});
test('corrupt report storage is surfaced and can be explicitly cleared', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('veylo:reports:v1', '{corrupt'));
  await open(page, '/reports'); await expect(page.getByText(/Saved reports could not be read/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('veylo:reports:v1'))).toBe('{corrupt');
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByRole('button', { name: 'Clear reports', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear all reports', exact: true }).click();
  await expect(page.getByText('All local reports have been cleared.')).toBeVisible();
});

test('membership screen is honestly unavailable on web and loads no billing SDK', async ({ page }) => {
  const external: string[] = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5000') && !request.url().startsWith('data:')) external.push(request.url()); });
  await open(page, '/paywall');
  await expect(page.getByRole('heading', { name: 'Veylo Plus', exact: true })).toBeVisible();
  await expect(page.getByText('Not available in this environment', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to store checkout' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to your device' }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  expect(external).toEqual([]);
});
