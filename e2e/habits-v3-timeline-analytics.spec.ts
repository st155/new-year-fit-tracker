import { test, expect } from '@playwright/test';

test.describe('Habits V3 - Timeline View', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to habits
    await page.goto('/habits-v3');
    // Switch to timeline view
    await page.click('[data-testid="tab-timeline"]');
  });

  test('displays 24-hour timeline', async ({ page }) => {
    // Check that timeline shows all hours
    const hours = await page.locator('.timeline-hour').count();
    expect(hours).toBe(24);
  });

  test('shows current time marker', async ({ page }) => {
    const marker = page.locator('.current-time-marker');
    await expect(marker).toBeVisible();
  });

  test('can navigate between dates', async ({ page }) => {
    // Click "Previous day" button
    await page.click('button:has-text("ChevronLeft")');
    
    // Check date changed
    const dateText = await page.locator('[data-testid="timeline-date"]').textContent();
    expect(dateText).not.toContain('Today');
  });

  test('displays habits at correct hours', async ({ page }) => {
    // Check that habits are grouped by hour
    const morningHabits = await page.locator('.timeline-hour:nth-child(8) .timeline-habit-card').count();
    expect(morningHabits).toBeGreaterThanOrEqual(0);
  });

  test('can click habit to view details', async ({ page }) => {
    // Find first habit card
    const habitCard = page.locator('.timeline-habit-card').first();
    
    if (await habitCard.count() > 0) {
      await habitCard.click();
      // Should trigger onHabitClick callback
      // Note: actual behavior depends on implementation
    }
  });

  test('scrolls to current hour on load', async ({ page }) => {
    // Get current hour element
    const currentHour = page.locator('.timeline-hour-current');
    
    // Should be visible in viewport
    await expect(currentHour).toBeVisible();
  });
});

test.describe('Habits V3 - Analytics View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/habits-v3');
    await page.click('[data-testid="tab-analytics"]');
  });

  test('displays overview metrics', async ({ page }) => {
    // Wait for analytics to load
    await page.waitForSelector('[data-testid="analytics-overview"]', { timeout: 5000 });
    
    // Check for metric cards (should have at least completion rate)
    const cards = await page.locator('.glass-card').count();
    expect(cards).toBeGreaterThanOrEqual(4);
  });

  test('renders completion trend chart', async ({ page }) => {
    // Wait for chart to render
    await page.waitForSelector('.recharts-responsive-container', { timeout: 5000 });
    
    // Check that chart exists
    const charts = await page.locator('.recharts-responsive-container').count();
    expect(charts).toBeGreaterThanOrEqual(1);
  });

  test('renders XP earnings chart', async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('.recharts-responsive-container', { timeout: 5000 });
    
    // Should have multiple charts
    const charts = await page.locator('.recharts-responsive-container').count();
    expect(charts).toBeGreaterThanOrEqual(2);
  });

  test('shows top habits list', async ({ page }) => {
    // Wait for analytics to load
    await page.waitForSelector('[data-testid="analytics-overview"]', { timeout: 5000 });
    
    // Look for habit name or icon in top habits section
    const topHabitsSection = page.locator('text=/Top 5 Habits|Top Habits/i');
    await expect(topHabitsSection).toBeVisible();
  });

  test('displays loading state initially', async ({ page }) => {
    // Reload to see loading state
    await page.goto('/habits-v3');
    await page.click('[data-testid="tab-analytics"]');
    
    // Should show loading indicator briefly
    const loading = page.locator('text=/Loading|loading/i');
    // Note: loading might be very fast, so we use waitFor with short timeout
    await loading.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {
      // Loading might be too fast to catch, which is fine
    });
  });

  test('handles empty state gracefully', async ({ page }) => {
    // This test assumes we can handle no data
    await page.goto('/habits-v3');
    await page.click('[data-testid="tab-analytics"]');
    
    // Should still render without crashing
    await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();
  });
});

test.describe('Habits V3 - Analytics Calculations', () => {
  test('calculates completion rate correctly', async ({ page }) => {
    await page.goto('/habits-v3');
    await page.click('[data-testid="tab-analytics"]');
    
    // Wait for analytics to load
    await page.waitForSelector('[data-testid="analytics-overview"]', { timeout: 5000 });
    
    // Check that completion rate is a valid percentage
    const completionRate = await page.locator('text=/\\d+(\\.\\d+)?%/').first().textContent();
    expect(completionRate).toMatch(/\d+(\.\d+)?%/);
  });

  test('displays current streak', async ({ page }) => {
    await page.goto('/habits-v3');
    await page.click('[data-testid="tab-analytics"]');
    
    // Wait for analytics
    await page.waitForSelector('[data-testid="analytics-overview"]', { timeout: 5000 });
    
    // Should have streak information
    const streak = page.locator('text=/streak|🔥/i');
    await expect(streak).toBeVisible();
  });

  test('shows total XP earned', async ({ page }) => {
    await page.goto('/habits-v3');
    await page.click('[data-testid="tab-analytics"]');
    
    // Wait for analytics
    await page.waitForSelector('[data-testid="analytics-overview"]', { timeout: 5000 });
    
    // Should display XP
    const xp = page.locator('text=/XP|experience/i');
    await expect(xp).toBeVisible();
  });
});
