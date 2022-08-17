import { test } from './common';
import { expect, Locator, Page } from '@playwright/test';

test.describe('Test Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/register/');
  });

  test('Use Register Form - Success', async ({ page, name, password }) => {
    // enter name
    await page.locator('input.mdc-text-field__input >> nth=0').fill(name);
    await expect(page.locator('input.mdc-text-field__input >> nth=0')).toHaveValue(name);
    
    // enter date of birth
    await page.locator('input.mdc-text-field__input >> nth=1').fill('1970-01-01');
    await expect(page.locator('input.mdc-text-field__input >> nth=1')).toHaveValue('1970-01-01');
    
    // enter phone number
    await page.locator('input.mdc-text-field__input >> nth=2').fill('12345');
    await expect(page.locator('input.mdc-text-field__input >> nth=2')).toHaveValue('12345');

    // enter email address (unique)
    await page.locator('input.mdc-text-field__input >> nth=3').fill(name + '@test.com');
    await expect(page.locator('input.mdc-text-field__input >> nth=3')).toHaveValue(name + '@test.com');

    // enter username (unique)
    await page.locator('input.mdc-text-field__input >> nth=4').fill(name);
    await expect(page.locator('input.mdc-text-field__input >> nth=4')).toHaveValue(name);

    // enter password
    await page.locator('input.mdc-text-field__input >> nth=5').fill(password);
    await expect(page.locator('input.mdc-text-field__input >> nth=5')).toHaveValue(password);

    // confirm password
    await page.locator('input.mdc-text-field__input >> nth=6').fill(password);
    await expect(page.locator('input.mdc-text-field__input >> nth=6')).toHaveValue(password);

    // click register button
    await Promise.all([
        page.locator('button.mdc-button').click(),
        page.waitForResponse(response => response.status() === 200),
    ])
    // need a way to check if the registration is done, until then
    await page.evaluate(() => {
        return new Promise((resolve) => setTimeout(resolve, 5000));
    })

    // check on email verification page
    await expect(page.locator('h1 >> nth=2')).toHaveText('Email Verification')
  })
  
  test('Use Register Form - Invalid Data', async ({ page, name }) => {
    // get unique identifier
    const uid = Date.now();

    // enter name
    await page.locator('input.mdc-text-field__input >> nth=0').fill(name);
    await expect(page.locator('input.mdc-text-field__input >> nth=0')).toHaveValue(name);
    
    // enter invalid date of birth
    await page.locator('input.mdc-text-field__input >> nth=1').fill('2070-01-01');
    await expect(page.locator('input.mdc-text-field__input >> nth=1')).toHaveValue('2070-01-01');
    
    // enter phone number
    await page.locator('input.mdc-text-field__input >> nth=2').fill('12345');
    await expect(page.locator('input.mdc-text-field__input >> nth=2')).toHaveValue('12345');
    
    // enter invalid email address (unique)
    await page.locator('input.mdc-text-field__input >> nth=3').fill(name);
    await expect(page.locator('input.mdc-text-field__input >> nth=3')).toHaveValue(name);

    // enter username (unique)
    await page.locator('input.mdc-text-field__input >> nth=4').fill(name + '@test-user.com');
    await expect(page.locator('input.mdc-text-field__input >> nth=4')).toHaveValue(name + '@test-user.com');

    // enter invalid password
    await page.locator('input.mdc-text-field__input >> nth=5').fill('password1');
    await expect(page.locator('input.mdc-text-field__input >> nth=5')).toHaveValue('password1');

    // confirm invalid password
    await page.locator('input.mdc-text-field__input >> nth=6').fill('password2');
    await expect(page.locator('input.mdc-text-field__input >> nth=6')).toHaveValue("password2");

    // check error messages
    await expect(page.locator('div#dob-error.input_error.invalid')).toHaveText('Invalid date of birth.');
    await expect(page.locator('div#email-error.input_error.invalid')).toHaveText('Please enter a valid email address.');
    await expect(page.locator('div#username-error.input_error.invalid')).toHaveText('Usernames must have at least 3 characters and contain no spaces or the \'@\' symbol.');
    await expect(page.locator('div#password-error.input_error.invalid')).toHaveText('Passwords must have at least 8 characters. Please use lower-case and upper-case characters, numbers, and special characters.');
    
    // click register button
    await page.locator('button.mdc-button').click()
    await page.waitForLoadState('load');

    // check on register page
    await expect(page.locator('h1 >> nth=1')).toHaveText('Create Account')

    // check error messages
    await expect(page.locator('div#confirmation-error.input_error.invalid')).toHaveText('The entered passwords do not match.');
  })
})
