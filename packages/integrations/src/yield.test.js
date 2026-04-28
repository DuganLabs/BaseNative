import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findBestYieldAccount,
  optimizeFloatAllocation,
  calculateOptimalTransferTiming,
  calculateBreakEven,
} from './yield.js';

describe('yield optimization', () => {
  describe('findBestYieldAccount', () => {
    it('returns the account with highest APY', () => {
      const accounts = [
        { id: 'acc-1', name: 'Checking', balance: 1000, apy: 0.01 },
        { id: 'acc-2', name: 'Money Market', balance: 5000, apy: 0.045 },
        { id: 'acc-3', name: 'Savings', balance: 2000, apy: 0.035 },
      ];

      const result = findBestYieldAccount(accounts);

      assert.equal(result.accountId, 'acc-2');
      assert.equal(result.accountName, 'Money Market');
      assert.equal(result.apy, 0.045);
    });

    it('calculates expected monthly yield correctly', () => {
      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 12000, apy: 0.12 }, // 12% APY = 1% per month
      ];

      const result = findBestYieldAccount(accounts);

      // 12000 * (0.12 / 12) = 120
      assert.equal(result.expectedMonthlyYield, 120);
    });

    it('throws on empty accounts', () => {
      assert.throws(
        () => findBestYieldAccount([]),
        /No accounts provided/
      );
    });

    it('throws on null accounts', () => {
      assert.throws(
        () => findBestYieldAccount(null),
        /No accounts provided/
      );
    });

    it('handles single account', () => {
      const accounts = [
        { id: 'only', name: 'Single', balance: 5000, apy: 0.05 },
      ];

      const result = findBestYieldAccount(accounts);

      assert.equal(result.accountId, 'only');
      assert.equal(result.apy, 0.05);
    });
  });

  describe('optimizeFloatAllocation', () => {
    it('allocates float to highest-yield accounts first', () => {
      const accounts = [
        { id: 'low', name: 'Low Yield', balance: 1000, apy: 0.01, maxBalance: Infinity },
        { id: 'high', name: 'High Yield', balance: 2000, apy: 0.05, maxBalance: Infinity },
        { id: 'mid', name: 'Mid Yield', balance: 1500, apy: 0.03, maxBalance: Infinity },
      ];

      const result = optimizeFloatAllocation(accounts, 10000);

      assert.equal(result.length, 1);
      assert.equal(result[0].accountId, 'high'); // Highest APY first
      assert.equal(result[0].allocation, 10000); // All goes to high
    });

    it('respects max balance limits', () => {
      const accounts = [
        { id: 'acc-1', name: 'Limited', balance: 2000, apy: 0.10, maxBalance: 5000 },
        { id: 'acc-2', name: 'Unlimited', balance: 1000, apy: 0.08 },
      ];

      const result = optimizeFloatAllocation(accounts, 5000);

      const acc1 = result.find(r => r.accountId === 'acc-1');
      const acc2 = result.find(r => r.accountId === 'acc-2');

      assert.equal(acc1.allocation, 3000); // Limited to 5000 - 2000
      assert.equal(acc2.allocation, 2000); // Remainder
    });

    it('calculates expected yield for each allocation', () => {
      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 0, apy: 0.12 },
      ];

      const result = optimizeFloatAllocation(accounts, 10000);

      // 10000 * (0.12 / 12) = 100
      assert.equal(result[0].expectedYield, 100);
    });

    it('handles zero float', () => {
      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 1000, apy: 0.05 },
      ];

      const result = optimizeFloatAllocation(accounts, 0);

      assert.equal(result.length, 0);
    });

    it('throws on negative float', () => {
      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 1000, apy: 0.05 },
      ];

      assert.throws(
        () => optimizeFloatAllocation(accounts, -1000),
        /non-negative/
      );
    });

    it('throws on empty accounts', () => {
      assert.throws(
        () => optimizeFloatAllocation([], 10000),
        /No accounts provided/
      );
    });
  });

  describe('calculateOptimalTransferTiming', () => {
    it('creates transfer schedule for liabilities', () => {
      const liabilities = [
        { dueDate: new Date('2025-05-15'), amount: 5000, description: 'Payroll' },
        { dueDate: new Date('2025-06-01'), amount: 3000, description: 'Rent' },
      ];

      const accounts = [
        { id: 'acc-1', name: 'Money Market', balance: 10000, apy: 0.05 },
      ];

      const schedule = calculateOptimalTransferTiming(liabilities, accounts);

      assert.equal(schedule.length, 2);
      assert.equal(schedule[0].amount, 5000);
      assert.equal(schedule[1].amount, 3000);
    });

    it('schedules transfers 2 days before due date', () => {
      const dueDate = new Date('2025-05-15');
      const liabilities = [{ dueDate, amount: 1000 }];

      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 5000, apy: 0.05 },
      ];

      const schedule = calculateOptimalTransferTiming(liabilities, accounts);

      const expectedDate = new Date(dueDate);
      expectedDate.setDate(expectedDate.getDate() - 2);

      assert.equal(schedule[0].transferDate.toISOString(), expectedDate.toISOString());
    });

    it('sorts schedule by due date', () => {
      const liabilities = [
        { dueDate: new Date('2025-06-01'), amount: 1000 },
        { dueDate: new Date('2025-05-01'), amount: 2000 },
        { dueDate: new Date('2025-05-15'), amount: 1500 },
      ];

      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 10000, apy: 0.05 },
      ];

      const schedule = calculateOptimalTransferTiming(liabilities, accounts);

      assert.equal(schedule[0].amount, 2000); // May 1
      assert.equal(schedule[1].amount, 1500); // May 15
      assert.equal(schedule[2].amount, 1000); // June 1
    });

    it('throws on empty liabilities', () => {
      const accounts = [
        { id: 'acc-1', name: 'Test', balance: 5000, apy: 0.05 },
      ];

      const result = calculateOptimalTransferTiming([], accounts);
      assert.equal(result.length, 0);
    });

    it('throws on empty accounts', () => {
      const liabilities = [
        { dueDate: new Date('2025-05-15'), amount: 1000 },
      ];

      assert.throws(
        () => calculateOptimalTransferTiming(liabilities, []),
        /No accounts available/
      );
    });
  });

  describe('calculateBreakEven', () => {
    it('determines profitability of a transfer', () => {
      // 5% source, 10% destination, $1000, 30 days
      // Yield diff = 5% / year = 0.05 / 365 * 1000 * 30 = $4.11
      // No transfer cost, so profitable
      const result = calculateBreakEven(100000, 0.05, 0.10, 0, 30);

      assert.equal(result.profitable, true);
      assert.ok(result.yieldGain > 0);
    });

    it('calculates break-even days correctly', () => {
      // $1000, 5% difference, $1 transfer cost
      // Daily yield = 1000 * (0.05 / 365) = $0.137
      // Break-even = 1 / 0.137 ≈ 7.3 days
      const result = calculateBreakEven(100000, 0.05, 0.10, 100);

      assert.ok(result.breakEvenDays > 0);
      assert.ok(result.breakEvenDays < 100);
    });

    it('returns false when destination APY is lower', () => {
      const result = calculateBreakEven(100000, 0.10, 0.05, 0, 30);

      assert.equal(result.profitable, false);
      assert.equal(result.yieldGain, 0);
      assert.equal(result.breakEvenDays, Infinity);
    });

    it('returns false when destination APY equals source APY', () => {
      const result = calculateBreakEven(100000, 0.05, 0.05, 0, 30);

      assert.equal(result.profitable, false);
    });

    it('accounts for transfer costs', () => {
      // Small amount, high cost relative to gain
      const result = calculateBreakEven(10000, 0.05, 0.10, 10000, 1); // $100 transfer cost

      assert.equal(result.profitable, false); // Cost exceeds 1-day gain
    });

    it('uses defaults for optional parameters', () => {
      const result = calculateBreakEven(100000, 0.05, 0.10);

      assert.equal(result.profitable, true);
      assert.ok(result.yieldGain > 0);
    });

    it('handles zero transfer cost', () => {
      const result = calculateBreakEven(100000, 0.05, 0.10, 0, 30);

      assert.equal(result.profitable, true);
      assert.ok(result.yieldGain > 0);
      assert.ok(result.breakEvenDays < 1); // Should be immediate with no cost
    });
  });
});
