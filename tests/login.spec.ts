import { test } from './common';
import { expect, Locator, Page } from '@playwright/test';

test.describe('Test Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
  });

  test('Browse to Login Page', async ({ page }) => {
    // check on login page
    await expect(page.locator('button.mdc-button')).toHaveText("Login")
  })

  test('Use Login Form - Success', async ({ page, name, password }) => {
    // enter username
    await page.locator('input.mdc-text-field__input >> nth=0').fill(name);
    await expect(page.locator('input.mdc-text-field__input >> nth=0')).toHaveValue(name);
    
    // enter password
    await page.locator('input.mdc-text-field__input >> nth=1').fill(password);
    await expect(page.locator('input.mdc-text-field__input >> nth=1')).toHaveValue(password);
    
    // click login button
    await page.locator('button.mdc-button').click()

    // check on chat page
    await expect(page.locator('h2 >> nth=1')).toContainText('YaMa Chat')
  })

  test('Use Login Form - Invalid Data', async ({ page, name, password }) => {
    // enter username
    await page.locator('input.mdc-text-field__input >> nth=0').fill(name + "wrong");
    await expect(page.locator('input.mdc-text-field__input >> nth=0')).toHaveValue(name + "wrong");

    // enter password
    await page.locator('input.mdc-text-field__input >> nth=1').fill(password);
    await expect(page.locator('input.mdc-text-field__input >> nth=1')).toHaveValue(password);

    // click login button
    await Promise.all([
        page.locator('button.mdc-button').click(),
        page.waitForResponse(response => response.status() === 401),
    ])
  })

  test('Browse to Register Form', async ({ page }) => {
    // click register link
    await page.locator('a:has-text("Create Account")').click()

    // check on register page
    await expect(page.locator('h1 >> nth=1')).toHaveText('Create Account')
  })
})
