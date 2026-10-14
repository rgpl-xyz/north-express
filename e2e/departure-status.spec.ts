import type { Page } from '@playwright/test';
import type { DigitrafficTrain } from '../src/app/features/departures/data/digitraffic-wire';
import { TAMPERE_DEPARTURES_FIXTURE } from '../src/testing/digitraffic-fixtures';
import { chooseStation, expect, test } from './fixtures';

/** Tampere as captured, where IC 25 is 2 min late, with IC 38 cancelled and IC 467 12 min late. */
const DISRUPTED_TAMPERE: readonly DigitrafficTrain[] = TAMPERE_DEPARTURES_FIXTURE.map((train) => {
  if (train.trainNumber === 38) {
    return { ...train, cancelled: true };
  }
  if (train.trainNumber === 467) {
    return {
      ...train,
      timeTableRows: train.timeTableRows.map((row) => ({ ...row, differenceInMinutes: 12 })),
    };
  }
  return train;
});

/** Signal yellow and red, the marks for late and cancelled departures. */
const YELLOW = 'rgb(255, 199, 44)';
const RED = 'rgb(200, 16, 46)';
const NONE = 'rgba(0, 0, 0, 0)';

const statusOf = (page: Page, train: string) =>
  page.getByRole('row').filter({ hasText: train }).locator('[col-id="status"]');
const markOf = (page: Page, train: string) => statusOf(page, train).locator('.status');

test.beforeEach(async ({ page, digitraffic }) => {
  digitraffic.setDepartures('TPE', DISRUPTED_TAMPERE);
  await page.goto('/departures/trains');
  await chooseStation(page, 'Tampere');
});

test('late departures are marked in bold on yellow and cancelled ones on red', async ({ page }) => {
  await expect(statusOf(page, 'IC 25')).toHaveText('2 min late');
  await expect(markOf(page, 'IC 25')).toHaveCSS('background-color', YELLOW);
  await expect(markOf(page, 'IC 25')).toHaveCSS('font-weight', '700');
  await expect(statusOf(page, 'IC 467')).toHaveText('12 min late');
  await expect(statusOf(page, 'IC 38')).toHaveText('Cancelled');
  await expect(markOf(page, 'IC 38')).toHaveCSS('background-color', RED);
  await expect(markOf(page, 'IC 38')).toHaveCSS('font-weight', '700');
  await expect(statusOf(page, 'Commuter M')).toHaveText('On time');
  await expect(markOf(page, 'Commuter M')).toHaveCSS('background-color', NONE);
  await expect(markOf(page, 'Commuter M')).toHaveCSS('font-weight', '500');
});

test('the Status column sorts on time first, then by minutes late, then cancelled', async ({
  page,
}) => {
  const statuses = page.locator('[role="gridcell"][col-id="status"]');
  await expect(statuses).toHaveText(['On time', 'Cancelled', '2 min late', '12 min late']);

  await page.getByRole('columnheader', { name: 'Status' }).click();

  await expect(statuses).toHaveText(['On time', '2 min late', '12 min late', 'Cancelled']);
});
