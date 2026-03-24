import { describe, it, expect } from 'vitest';
import {
  simulatePriceMove,
  generateOrderBook,
  generateInitialTrades,
  getCurrentPrice,
  MOCK_BONDS,
} from './mock-data';

describe('MOCK_BONDS', () => {
  it('contains 10 bonds', () => {
    expect(MOCK_BONDS.length).toBe(10);
  });

  it('every bond has required fields', () => {
    MOCK_BONDS.forEach(bond => {
      expect(bond.id).toBeTruthy();
      expect(bond.name).toBeTruthy();
      expect(bond.basePrice).toBeGreaterThan(0);
      expect(bond.tickSize).toBeGreaterThan(0);
      expect(bond.coupon).toBeGreaterThan(0);
    });
  });

  it('includes UST10Y as the default bond', () => {
    const ust = MOCK_BONDS.find(b => b.id === 'UST10Y');
    expect(ust).toBeDefined();
    expect(ust?.type).toBe('treasury');
  });
});

describe('simulatePriceMove', () => {
  it('returns a number for a known bond', () => {
    const price = simulatePriceMove('UST10Y');
    expect(typeof price).toBe('number');
    expect(isNaN(price)).toBe(false);
  });

  it('returns 100 for an unknown bond', () => {
    expect(simulatePriceMove('UNKNOWN')).toBe(100);
  });

  it('stays within 5% of base price', () => {
    const bond = MOCK_BONDS.find(b => b.id === 'UST10Y')!;
    for (let i = 0; i < 50; i++) {
      const price = simulatePriceMove('UST10Y');
      expect(price).toBeGreaterThanOrEqual(bond.basePrice * 0.95);
      expect(price).toBeLessThanOrEqual(bond.basePrice * 1.05);
    }
  });

  it('price is snapped to tick size', () => {
    const bond = MOCK_BONDS.find(b => b.id === 'UST10Y')!;
    for (let i = 0; i < 20; i++) {
      const price = simulatePriceMove('UST10Y');
      const ticks = price / bond.tickSize;
      expect(Math.round(ticks)).toBeCloseTo(ticks, 8);
    }
  });
});

describe('generateOrderBook', () => {
  it('returns 8 bids and 8 asks', () => {
    const { bids, asks } = generateOrderBook('UST10Y', 98.5);
    expect(bids.length).toBe(8);
    expect(asks.length).toBe(8);
  });

  it('bids are below mid price', () => {
    const mid = 98.5;
    const { bids } = generateOrderBook('UST10Y', mid);
    bids.forEach(bid => expect(bid.price).toBeLessThan(mid));
  });

  it('asks are above mid price', () => {
    const mid = 98.5;
    const { asks } = generateOrderBook('UST10Y', mid);
    asks.forEach(ask => expect(ask.price).toBeGreaterThan(mid));
  });

  it('all levels have positive quantity and orders', () => {
    const { bids, asks } = generateOrderBook('UST10Y', 98.5);
    [...bids, ...asks].forEach(level => {
      expect(level.quantity).toBeGreaterThan(0);
      expect(level.orders).toBeGreaterThanOrEqual(1);
    });
  });

  it('returns empty book for unknown bond', () => {
    const { bids, asks } = generateOrderBook('UNKNOWN', 100);
    expect(bids.length).toBe(0);
    expect(asks.length).toBe(0);
  });
});

describe('generateInitialTrades', () => {
  it('generates 18 trades', () => {
    const trades = generateInitialTrades();
    expect(trades.length).toBe(18);
  });

  it('trades are sorted newest first', () => {
    const trades = generateInitialTrades();
    for (let i = 0; i < trades.length - 1; i++) {
      expect(trades[i].time).toBeGreaterThanOrEqual(trades[i + 1].time);
    }
  });

  it('each trade has required fields', () => {
    generateInitialTrades().forEach(trade => {
      expect(trade.id).toBeTruthy();
      expect(trade.bondId).toBeTruthy();
      expect(trade.notional).toBeGreaterThan(0);
      expect(['buy', 'sell']).toContain(trade.direction);
      expect(['filled', 'rejected']).toContain(trade.status);
    });
  });
});

describe('getCurrentPrice', () => {
  it('returns base price for a bond before any moves', () => {
    const bond = MOCK_BONDS.find(b => b.id === 'APPL5Y')!;
    const price = getCurrentPrice('APPL5Y');
    expect(price).toBeCloseTo(bond.basePrice, 1);
  });

  it('returns base price (100) for unknown bond', () => {
    expect(getCurrentPrice('UNKNOWN')).toBe(100);
  });
});
