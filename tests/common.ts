// my-test.ts
import { test as base } from '@playwright/test';

export type TestOptions = {
  uid: number;
  name: string;
  password: string;
};

let uid_ = Date.now()

export const test = base.extend<TestOptions>({
  // Define an option and provide a default value.
  // We can later override it in the config.
  uid: [uid_, { option: true }],
  name: [uid_ + 'test-user', { option: true }],
  password: ['Test-Password-1', { option: true}]
});
