import type { Page } from '@playwright/test';
import { PASILA_RING_TRAIN_FIXTURE } from '../src/testing/digitraffic-fixtures';
import { chooseStation, expect, test } from './fixtures';

const ringTrain = (page: Page) => page.getByRole('row').filter({ hasText: 'Commuter P' });

async function choosePasila(page: Page): Promise<void> {
  await page.goto('/departures/trains');
  await chooseStation(page, 'Pasila');
}

// Fixture times are UTC; Finland is UTC+3 on 13 October 2026.
test('at Pasila, a ring train shows the pass that has not left yet', async ({ page }) => {
  await choosePasila(page);

  // The outbound pass at 12:22 has gone; the return pass into Helsinki is next.
  await expect(ringTrain(page)).toHaveCount(1);
  await expect(ringTrain(page)).toContainText('13:16');
  await expect(ringTrain(page)).toContainText('Helsinki');
});

test('before it sets off, a ring train at Pasila is bound for the airport', async ({
  page,
  digitraffic,
}) => {
  digitraffic.setDepartures(
    'PSL',
    PASILA_RING_TRAIN_FIXTURE.map((train) => ({
      ...train,
      timeTableRows: train.timeTableRows.map((row) => ({ ...row, actualTime: undefined })),
    })),
  );

  await choosePasila(page);

  await expect(ringTrain(page)).toHaveCount(1);
  await expect(ringTrain(page)).toContainText('12:22');
  await expect(ringTrain(page)).toContainText('Lentoasema (Airport)');
});
