/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import { test, expect, retries } from './ui-mode-fixtures';

test.describe.configure({ mode: 'parallel', retries });

test('should contain file attachment', async ({ runUITest }) => {
  const { page } = await runUITest({
    'a.test.ts': `
      import { test } from '@playwright/test';
      test('attach test', async () => {
        await test.info().attach('note', { path: __filename });
      });
    `,
  });
  await page.getByText('attach test').click();
  await page.getByTitle('Run all').click();
  await expect(page.getByTestId('status-line')).toHaveText('1/1 passed (100%)');
  await page.getByText('Attachments').click();
  await page.getByText('attach "note"', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'note' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('note');
  expect((await readAllFromStream(await download.createReadStream())).toString()).toContain('attach test');
});

test('should contain string attachment', async ({ runUITest }) => {
  const { page } = await runUITest({
    'a.test.ts': `
      import { test } from '@playwright/test';
      test('attach test', async () => {
        await test.info().attach('note', { body: 'text42' });
      });
    `,
  });
  await page.getByText('attach test').click();
  await page.getByTitle('Run all').click();
  await expect(page.getByTestId('status-line')).toHaveText('1/1 passed (100%)');
  await page.getByText('Attachments').click();
  await page.getByText('attach "note"', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'note' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('note');
  expect((await readAllFromStream(await download.createReadStream())).toString()).toEqual('text42');
});

test('should contain attachment with filename and extension', async ({ runUITest, asset }) => {
  const { page } = await runUITest({
    'a.test.ts': `
      import { test } from '@playwright/test';
      test('attach test', async () => {
        await test.info().attach('screenshot.png', { path: ${JSON.stringify(asset('pptr.png'))} });
      });
    `,
  });
  await page.getByText('attach test').click();
  await page.getByTitle('Run all').click();
  await expect(page.getByTestId('status-line')).toHaveText('1/1 passed (100%)');
  await page.getByText('Attachments').click();
  await page.getByText('attach "screenshot.png"', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'screenshot.png' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('screenshot.png');
  expect(await readAllFromStream(await download.createReadStream())).toEqual(fs.readFileSync(asset('pptr.png')));
});

function readAllFromStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
