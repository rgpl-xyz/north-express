import { expect, test } from './fixtures';

// In Safari's engine a board's switch to the phone layout used to end in "Something went
// wrong": ag-grid's resize observers raise a notice that the error handler took for an error.
for (const [board, address] of [
  ['train', '/departures/trains?station=TPE'],
  ['bus', '/departures/buses?station=MATKA:358750'],
]) {
  test(`the ${board} board opens without an error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.goto(address);
    await expect(page.getByRole('gridcell').first()).toBeVisible();
    // Long enough for the board to settle in its layout.
    await page.waitForTimeout(1000);

    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
