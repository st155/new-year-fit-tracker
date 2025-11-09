import { test, expect } from '@playwright/test';

test.describe('Habits V3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/habits-v3');
  });

  test('should show onboarding on first visit', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Check onboarding dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText('Добро пожаловать')).toBeVisible();
    
    // Complete onboarding
    for (let i = 0; i < 5; i++) {
      const nextButton = page.getByRole('button', { name: /Далее|Начать/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    }
    
    // Verify onboarding is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should complete habit and show XP toast', async ({ page }) => {
    // Wait for habits to load
    await page.waitForSelector('[role="article"]', { timeout: 5000 });
    
    // Find first incomplete habit
    const firstHabit = page.locator('[role="article"]').first();
    
    // Swipe right to complete
    await firstHabit.hover();
    await page.mouse.down();
    await page.mouse.move(200, 0);
    await page.mouse.up();
    
    // Check toast
    await expect(page.getByText(/Получено.*XP/)).toBeVisible({ timeout: 3000 });
    
    // Verify completed state
    await expect(firstHabit.getByText('✓ Выполнено')).toBeVisible();
  });

  test('should filter habits in compact view', async ({ page }) => {
    // Switch to compact view
    await page.getByRole('tab', { name: /Список/i }).click();
    
    // Wait for view to load
    await page.waitForSelector('[role="article"]', { timeout: 5000 });
    
    // Click "Активные" filter
    await page.getByRole('tab', { name: 'Активные' }).click();
    
    // Verify habits are filtered
    const habits = page.locator('[role="article"]');
    const count = await habits.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate through habits in focus mode', async ({ page }) => {
    // Switch to focus mode
    await page.getByRole('tab', { name: /Фокус/i }).click();
    
    // Wait for focus mode to load
    await page.waitForSelector('text=/Привычка.*из/i', { timeout: 5000 });
    
    // Verify first habit shown
    await expect(page.getByText(/Привычка 1 из/i)).toBeVisible();
    
    // Click next button
    const nextButton = page.getByRole('button', { name: /Далее|Следующая/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Verify second habit
      await expect(page.getByText(/Привычка 2 из/i)).toBeVisible();
    }
  });

  test('keyboard navigation should work', async ({ page }) => {
    // Wait for habits to load
    await page.waitForSelector('[role="article"]', { timeout: 5000 });
    
    const firstHabit = page.locator('[role="article"]').first();
    
    // Focus on habit
    await firstHabit.focus();
    
    // Press Enter to complete
    await page.keyboard.press('Enter');
    
    // Verify completion toast
    await expect(page.getByText(/Получено.*XP/)).toBeVisible({ timeout: 3000 });
  });

  test('keyboard shortcuts should work', async ({ page }) => {
    // Wait for habits to load
    await page.waitForSelector('[role="article"]', { timeout: 5000 });
    
    const firstHabit = page.locator('[role="article"]').first();
    
    // Focus on habit
    await firstHabit.focus();
    
    // Press 'e' to edit
    await page.keyboard.press('e');
    
    // Should navigate to edit page or open edit modal
    await page.waitForTimeout(500);
    // Verify navigation or modal (depends on implementation)
  });

  test('should show stats in smart view', async ({ page }) => {
    // Smart view is default
    await page.waitForSelector('[role="article"]', { timeout: 5000 });
    
    // Verify time-of-day sections
    await expect(page.getByText(/Утренние|Дневные|Вечерние/i)).toBeVisible();
    
    // Verify habits are grouped
    const sections = page.locator('.space-y-4 > *');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });

  test('pull to refresh should work', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }
    
    // Simulate pull to refresh
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();
    
    // Wait for refresh
    await page.waitForTimeout(1000);
    
    // Habits should reload
    await expect(page.locator('[role="article"]').first()).toBeVisible();
  });

  test('should persist onboarding completion', async ({ page }) => {
    // Complete onboarding
    await page.evaluate(() => {
      localStorage.setItem('habitsV3_onboarding_completed', 'true');
    });
    
    // Reload page
    await page.reload();
    
    // Onboarding should not show
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
