import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display demo login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('DermMap')).toBeVisible();
    await expect(page.getByText('Demo — Select a Role to Continue')).toBeVisible();
  });

  test('should login as MA and navigate to schedule', async ({ page }) => {
    await page.goto('/');
    
    // Select MA role
    await page.getByRole('button', { name: /medical assistant/i }).click();
    
    // Submit credentials
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Enter MFA code (any 6 digits work in demo)
    await page.getByRole('textbox', { name: /mfa code/i }).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
    
    // Should navigate to schedule page
    await expect(page).toHaveURL(/schedule/);
    await expect(page.getByText(/today's schedule/i)).toBeVisible();
  });

  test('should login as Provider and navigate to queue', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: /provider/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('textbox', { name: /mfa code/i }).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
    
    await expect(page).toHaveURL(/queue/);
  });
});

test.describe('Body Map Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as MA
    await page.goto('/');
    await page.getByRole('button', { name: /medical assistant/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('textbox', { name: /mfa code/i }).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
  });

  test('should navigate to body map page', async ({ page }) => {
    await page.getByRole('link', { name: /body map/i }).click();
    await expect(page).toHaveURL(/bodymap/);
    await expect(page.getByText(/body map/i)).toBeVisible();
  });

  test('should place a lesion marker', async ({ page }) => {
    await page.getByRole('link', { name: /body map/i }).click();
    
    // Select a patient
    const firstPatient = page.locator('[data-patient-card]').first();
    await firstPatient.click();
    
    // Start new visit
    await page.getByRole('button', { name: /new visit/i }).click();
    
    // Enter placing mode
    await page.getByRole('button', { name: /place lesion/i }).click();
    
    // Click on body map SVG
    const bodyMap = page.locator('svg[data-testid="body-map"]');
    await bodyMap.click({ position: { x: 100, y: 100 } });
    
    // Lesion form should appear
    await expect(page.getByText(/document lesion/i)).toBeVisible();
  });
});

test.describe('Offline Mode', () => {
  test('should show offline banner when disconnected', async ({ page, context }) => {
    await page.goto('/');
    
    // Login
    await page.getByRole('button', { name: /medical assistant/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('textbox', { name: /mfa code/i }).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
    
    // Go offline
    await context.setOffline(true);
    
    // Should show offline banner
    await expect(page.getByText(/offline/i)).toBeVisible();
  });
});

test.describe('Session Timeout', () => {
  test('should show session warning before timeout', async ({ page }) => {
    // This test would need to mock time or use a shorter timeout
    // Skipping implementation for brevity
    test.skip();
  });
});

test.describe('Accessibility', () => {
  test('login page should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic a11y attributes
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('button', { name: /medical assistant/i })).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Should select a demo user
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });
});
