import { test } from './common';
import { expect, Locator, Page } from '@playwright/test';


test.describe('Test Chat Page', () => {
  test.beforeEach(async ({ page, name, password }) => {
    await page.goto('/#/');
    await page.locator('input.mdc-text-field__input >> nth=0').fill(name);
    await page.locator('input.mdc-text-field__input >> nth=1').fill(password);
    await page.locator('button.mdc-button:has-text("Login")').click()
  });

  test('Browse to Add Group Page', async ({ page }) => {
    // click add button
    await page.locator('#add-group').click()

    // check on add group page
    await expect(page.locator('h2 >> nth=1')).toHaveText(/Add a Group.*/)
  })

  test('Add Group', async ({ page, isMobile, uid }) => {
    test.skip(isMobile, "Add group feature not yet implemented for mobile")

    // click add button
    await page.locator('#add-group').click()

    // check on add group page
    await expect(page.locator('h2 >> nth=1')).toHaveText(/Add a Group.*/)
    
    if (isMobile) {
      // Implement this when complete - use #mobile-chat
    } else {      
      // enter group name (unique)
      await page.locator('#chat-panel input.mdc-text-field__input >> nth=0').fill(`${uid}-test-group`);
      await expect(page.locator('#chat-panel input.mdc-text-field__input >> nth=0')).toHaveValue(`${uid}-test-group`);

      // click create button
      await page.locator('#chat-panel button.mdc-button:has-text("Create")').click()
    }

    // check on chat page
    await expect(page.locator('h2 >> nth=1')).toContainText('YaMa Chat')
  })

  test('Browse to Group Page', async ({ page, isMobile, uid }) => {
    test.skip(isMobile, "Browse to Group page not yet implemented for mobile")

    await page.locator(`//div[contains(@class, "${uid}-test-group")]`).click()

    // check on group page
    await expect(page.locator('h2 >> nth=1')).toContainText(`${uid}-test-group`)
  })

  test('Browse to Group Settings Page', async ({ page, isMobile, uid }) => {
    test.skip(isMobile, "Browse to Group Settings page not yet implemented for mobile")

    await page.locator(`//div[contains(@class, "${uid}-test-group")]`).click()

    // check on group page
    await expect(page.locator('h2 >> nth=1')).toContainText(`${uid}-test-group`)

    // click settings button
    await page.locator(`button:has-text("settings")`).click()

    // check on settings page
    await expect(page.locator('h2 >> nth=1')).toContainText("Group Settings")
  })

  test('Add new channel', async ({ page, isMobile, uid }) => {
    test.skip(isMobile, "Browse to Group Settings page not yet implemented for mobile")

    await page.locator(`//div[contains(@class, "${uid}-test-group")]`).click()

    // check on group page
    await expect(page.locator('h2 >> nth=1')).toContainText(`${uid}-test-group`)

    // click settings button
    await page.locator(`button:has-text("settings")`).click()

    // check on settings page
    await expect(page.locator('h2 >> nth=1')).toContainText("Group Settings")

    // click the button
    await page.locator(`#chat-panel button:has-text("CREATE NEW CHANNEL")`).click()

    await page.locator('#chat-panel input.mdc-text-field__input >> nth=0').fill("NEWCHANNEL");
    await expect(page.locator('#chat-panel input.mdc-text-field__input >> nth=0')).toHaveValue("NEWCHANNEL");

    // click create button
    await page.locator(`#chat-panel button.mdc-button:has-text("CREATE")`).click()
  })

  test('Invite new member', async ({ page, isMobile, uid }) => {
    test.skip(isMobile, "Browse to Group Settings page not yet implemented for mobile")

    await page.locator(`//div[contains(@class, "${uid}-test-group")]`).click()

    // check on group page
    await expect(page.locator('h2 >> nth=1')).toContainText(`${uid}-test-group`)

    // click settings button
    await page.locator(`button:has-text("settings")`).click()

    // check on settings page
    await expect(page.locator('h2 >> nth=1')).toContainText("Group Settings")

    // click the button
    await page.locator(`#chat-panel button:has-text("INVITE NEW MEMBERS")`).click()

    // email
    await page.locator('#chat-panel input.mdc-text-field__input >> nth=0').fill("test2@test.com");
    await expect(page.locator('#chat-panel input.mdc-text-field__input >> nth=0')).toHaveValue("test2@test.com");
    // name
    await page.locator('#chat-panel input.mdc-text-field__input >> nth=1').fill("Test Name");
    await expect(page.locator('#chat-panel input.mdc-text-field__input >> nth=1')).toHaveValue("Test Name");
    // msg
    await page.locator('#chat-panel input.mdc-text-field__input >> nth=2').fill("message");
    await expect(page.locator('#chat-panel input.mdc-text-field__input >> nth=2')).toHaveValue("message");

    // click the button
    await page.locator(`#chat-panel button:has-text("INVITE NEW MEMBER")`).click()

    await expect(page.locator('#chat-screen')).toHaveText(' Select a group and a channel to start chatting');
  })

  test('Delete group', async ({ page, isMobile, uid }) => {
    test.skip(isMobile, "Browse to Group Settings page not yet implemented for mobile")

    await page.locator(`//div[contains(@class, "${uid}-test-group")]`).click()

    // check on group page
    await expect(page.locator('h2 >> nth=1')).toContainText(`${uid}-test-group`)

    // click settings button
    await page.locator(`button:has-text("settings")`).click()

    // check on settings page
    await expect(page.locator('h2 >> nth=1')).toContainText("Group Settings")

    // click the button
    await page.locator(`#chat-panel button:has-text("DELETE GROUP")`).click()

    await expect(page.locator('h3 >> nth=1')).toHaveText(/Delete Group Confirmation/)

    // click the button
    await page.locator(`#chat-panel button:has-text("DELETE GROUP")`).click()

    await expect(page.locator('#chat-screen')).toHaveText(' Select a group and a channel to start chatting');
  })

  test.afterEach(async ({ page }) => {
    await page.goto('/#/');
    await page.locator('button:has-text("Logout")').click();
  });
})
