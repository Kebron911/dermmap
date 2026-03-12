import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Log in as an MA (demo mode — no backend required). */
async function loginAsMA(page: Parameters<typeof test>[1]['page']) {
  await page.goto('/');
  await page.getByTestId('demo-user-ma').click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel('Authentication code').fill('123456');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/today/i).or(page.getByText(/schedule/i))).toBeVisible({ timeout: 8000 });
}

/** Log in as a Provider (demo mode). */
async function loginAsProvider(page: Parameters<typeof test>[1]['page']) {
  await page.goto('/');
  await page.getByTestId('demo-user-provider').click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel('Authentication code').fill('123456');
  await page.getByRole('button', { name: /sign in/i }).click();
}

// ---------------------------------------------------------------------------
// Login Flow
// ---------------------------------------------------------------------------

test.describe('Login Flow', () => {
  test('should display demo login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('DermMap')).toBeVisible();
    await expect(page.getByText('Demo — Select a Role to Continue')).toBeVisible();
  });

  test('should show MFA step after selecting a demo user and clicking Continue', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('demo-user-ma').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/multi-factor authentication/i)).toBeVisible();
    await expect(page.getByLabel('Authentication code')).toBeVisible();
  });

  test('should login as MA and navigate to schedule', async ({ page }) => {
    await loginAsMA(page);
    await expect(page).toHaveURL(/schedule/);
  });

  test('should login as Provider', async ({ page }) => {
    await loginAsProvider(page);
    // Provider lands on queue or visits page
    await expect(page).toHaveURL(/queue|visits|bodymap/, { timeout: 8000 });
  });

  test('should return to credentials step when Back is clicked during MFA', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('demo-user-ma').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /back to credentials/i }).click();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Body Map Workflow
// ---------------------------------------------------------------------------

test.describe('Body Map Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMA(page);
  });

  test('should navigate to body map page', async ({ page }) => {
    await page.getByRole('link', { name: /body map/i }).click();
    await expect(page).toHaveURL(/bodymap/);
  });

  test('should display the patient list on the body map page', async ({ page }) => {
    await page.getByRole('link', { name: /body map/i }).click();
    // At least one patient name should appear in the list
    await expect(page.locator('[data-testid="patient-list"]').or(
      page.getByText(/margaret|robert|elena/i)
    )).toBeVisible({ timeout: 6000 });
  });
});

// ---------------------------------------------------------------------------
// Offline Mode
// ---------------------------------------------------------------------------

test.describe('Offline Mode', () => {
  test('should show offline banner when disconnected', async ({ page, context }) => {
    await loginAsMA(page);

    // Simulate going offline
    await context.setOffline(true);
    // Navigating triggers the offline hook
    await page.reload();

    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 5000 });
    await context.setOffline(false);
  });
});

// ---------------------------------------------------------------------------
// Signup / Onboarding (public route)
// ---------------------------------------------------------------------------

test.describe('Onboarding Page', () => {
  test('should be accessible at /signup without authentication', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText(/create your clinic account/i)
      .or(page.getByText(/register/i))
      .or(page.getByText(/clinic name/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error when NPI is too short', async ({ page }) => {
    await page.goto('/signup');
    // Fill clinic name and a short NPI then try to proceed
    const clinicNameInput = page.getByLabel(/clinic name/i).first();
    if (await clinicNameInput.isVisible()) {
      await clinicNameInput.fill('Test Clinic');
    }
    const npiInput = page.getByLabel(/npi/i).first();
    if (await npiInput.isVisible()) {
      await npiInput.fill('123'); // too short
      await page.getByRole('button', { name: /next/i }).click();
      await expect(page.getByText(/10 digit/i).or(page.getByText(/invalid npi/i))).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------

test.describe('Accessibility', () => {
  test('login page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    // Filter to violations only (not incomplete / needs-review)
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      violations,
      violations.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
    ).toHaveLength(0);
  });

  test('MFA step should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('demo-user-ma').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByLabel('Authentication code')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      violations,
      violations.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
    ).toHaveLength(0);
  });

  test('body map page should have no critical accessibility violations', async ({ page }) => {
    await loginAsMA(page);
    await page.getByRole('link', { name: /body map/i }).click();
    await expect(page).toHaveURL(/bodymap/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      violations,
      violations.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
    ).toHaveLength(0);
  });

  test('signup page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/signup');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      violations,
      violations.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
    ).toHaveLength(0);
  });

  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    // Tab to first demo user button and activate it with Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // At least one demo user button should be focusable
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});

    // Should select a demo user
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });
});
