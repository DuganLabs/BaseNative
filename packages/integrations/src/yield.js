/**
 * Yield optimization for idle float management in PendingBusiness.
 *
 * Pure functions for determining optimal account allocation and transfer timing.
 * No external API calls — just the math for float yield maximization.
 */

/**
 * Find the best yield account from a list of linked accounts with balances and APYs.
 *
 * @param {Array<{ id: string, name: string, balance: number, apy: number }>} accounts
 * @returns {{ accountId: string, accountName: string, apy: number, expectedMonthlyYield: number }}
 */
export function findBestYieldAccount(accounts) {
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts provided for yield calculation');
  }

  let best = accounts[0];
  for (let i = 1; i < accounts.length; i++) {
    if (accounts[i].apy > best.apy) {
      best = accounts[i];
    }
  }

  // Calculate expected monthly yield on the account's current balance
  const monthlyRate = best.apy / 12;
  const expectedMonthlyYield = best.balance * monthlyRate;

  return {
    accountId: best.id,
    accountName: best.name,
    apy: best.apy,
    expectedMonthlyYield,
  };
}

/**
 * Determine optimal float allocation across multiple accounts.
 *
 * Allocates funds to maximize total yield while respecting account limits.
 *
 * @param {Array<{ id: string, name: string, balance: number, apy: number, maxBalance?: number }>} accounts
 * @param {number} totalFloat     Total float to allocate across accounts
 * @returns {Array<{ accountId: string, accountName: string, allocation: number, expectedYield: number }>}
 */
export function optimizeFloatAllocation(accounts, totalFloat) {
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts provided for allocation');
  }

  if (totalFloat < 0) {
    throw new Error('Total float must be non-negative');
  }

  // Sort accounts by APY descending
  const sorted = [...accounts].sort((a, b) => b.apy - a.apy);

  const allocation = [];
  let remaining = totalFloat;

  for (const account of sorted) {
    const max = account.maxBalance || Infinity;
    const allocate = Math.min(remaining, max - (account.balance || 0));

    if (allocate > 0) {
      const monthlyRate = account.apy / 12;
      const expectedYield = allocate * monthlyRate;

      allocation.push({
        accountId: account.id,
        accountName: account.name,
        allocation: allocate,
        expectedYield,
      });

      remaining -= allocate;
    }

    if (remaining === 0) break;
  }

  return allocation;
}

/**
 * Calculate optimal timing for float transfers based on liability due dates and yield.
 *
 * Returns a transfer schedule that keeps idle float in high-yield accounts
 * until it's needed to cover liabilities.
 *
 * @param {Array<{ dueDate: Date, amount: number, description?: string }>} liabilities
 * @param {Array<{ id: string, name: string, currentBalance: number, apy: number }>} accounts
 * @returns {Array<{ transferDate: Date, fromAccountId: string, amount: number, reason: string }>}
 */
export function calculateOptimalTransferTiming(liabilities, accounts) {
  if (!liabilities || liabilities.length === 0) {
    return [];
  }

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts available for float management');
  }

  // Find the best yield account
  const best = findBestYieldAccount(accounts);

  // Sort liabilities by due date
  const sorted = [...liabilities].sort((a, b) => a.dueDate - b.dueDate);

  const schedule = [];
  const transferBuffer = 2; // days before due date to transfer

  for (const liability of sorted) {
    const transferDate = new Date(liability.dueDate);
    transferDate.setDate(transferDate.getDate() - transferBuffer);

    schedule.push({
      transferDate,
      fromAccountId: best.accountId,
      amount: liability.amount,
      reason: liability.description || 'Scheduled liability payment',
    });
  }

  return schedule;
}

/**
 * Calculate the break-even point for a transfer based on yield difference.
 *
 * Determines if it's worth transferring money from one account to another
 * based on the yield difference and transfer cost.
 *
 * @param {number} amount             Amount to transfer (in cents)
 * @param {number} fromApy            APY of source account
 * @param {number} toApy              APY of destination account
 * @param {number} [transferCostCents=0] Fixed transfer cost (usually 0 for ACH)
 * @param {number} [daysFloat=30]     Number of days the money will be in destination
 * @returns {{ profitable: boolean, yieldGain: number, breakEvenDays: number }}
 */
export function calculateBreakEven(amount, fromApy, toApy, transferCostCents = 0, daysFloat = 30) {
  if (toApy <= fromApy) {
    return {
      profitable: false,
      yieldGain: 0,
      breakEvenDays: Infinity,
    };
  }

  const amountDollars = amount / 100;
  const costDollars = transferCostCents / 100;

  // Daily yield difference
  const yieldDiff = toApy - fromApy;
  const dailyYieldGain = amountDollars * (yieldDiff / 365);

  // Break-even point (how many days to recoup transfer cost)
  const breakEvenDays = dailyYieldGain > 0 ? costDollars / dailyYieldGain : Infinity;

  // Total yield gain over daysFloat
  const totalYieldGain = dailyYieldGain * daysFloat;
  const netGain = totalYieldGain - costDollars;

  return {
    profitable: netGain > 0,
    yieldGain: netGain,
    breakEvenDays,
  };
}
