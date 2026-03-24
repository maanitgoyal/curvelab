import { describe, it, expect, beforeEach } from 'vitest';
import { TradeBlotterService } from './trade-blotter.service';
import { Trade } from '../models/types';

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: `T-${Math.random().toString(36).slice(2)}`,
  time: Date.now(),
  bondId: 'UST10Y',
  bondName: 'US Treasury 10Y',
  direction: 'buy',
  notional: 10,
  price: 98.734,
  counterparty: 'Goldman Sachs',
  status: 'filled',
  ...overrides,
});

describe('TradeBlotterService', () => {
  let service: TradeBlotterService;

  beforeEach(() => {
    localStorage.clear();
    service = new TradeBlotterService();
  });

  it('creates successfully', () => {
    expect(service).toBeTruthy();
  });

  it('loads initial trades when localStorage is empty', () => {
    expect(service.filteredTrades().length).toBeGreaterThan(0);
  });

  it('addTrade prepends the new trade to the list', () => {
    const before = service.filteredTrades().length;
    const trade = makeTrade({ id: 'T-NEW' });
    service.addTrade(trade);
    expect(service.filteredTrades().length).toBe(before + 1);
    expect(service.filteredTrades()[0].id).toBe('T-NEW');
  });

  it('filter by filled shows only filled trades', () => {
    service.addTrade(makeTrade({ status: 'filled' }));
    service.addTrade(makeTrade({ status: 'rejected' }));
    service.setFilter('filled');
    expect(service.filteredTrades().every(t => t.status === 'filled')).toBe(true);
  });

  it('filter by rejected shows only rejected trades', () => {
    service.addTrade(makeTrade({ status: 'rejected' }));
    service.setFilter('rejected');
    expect(service.filteredTrades().every(t => t.status === 'rejected')).toBe(true);
  });

  it('filter all shows every trade', () => {
    service.addTrade(makeTrade({ status: 'filled' }));
    service.addTrade(makeTrade({ status: 'rejected' }));
    service.setFilter('all');
    const statuses = service.filteredTrades().map(t => t.status);
    expect(statuses).toContain('filled');
    expect(statuses).toContain('rejected');
  });

  it('setSort toggles direction when same column clicked twice', () => {
    service.setSort('notional');
    expect(service.sortAsc()).toBe(false);
    service.setSort('notional');
    expect(service.sortAsc()).toBe(true);
  });

  it('setSort resets to descending when a new column is selected', () => {
    service.setSort('notional');
    service.setSort('notional'); // now asc
    service.setSort('price');    // new column, back to desc
    expect(service.sortAsc()).toBe(false);
    expect(service.sortColumn()).toBe('price');
  });

  it('toggleExpanded flips the expanded state', () => {
    const initial = service.isExpanded();
    service.toggleExpanded();
    expect(service.isExpanded()).toBe(!initial);
    service.toggleExpanded();
    expect(service.isExpanded()).toBe(initial);
  });

  it('tradeCount totals are correct', () => {
    localStorage.clear();
    const fresh = new TradeBlotterService();
    fresh.addTrade(makeTrade({ status: 'filled' }));
    fresh.addTrade(makeTrade({ status: 'filled' }));
    fresh.addTrade(makeTrade({ status: 'rejected' }));
    const counts = fresh.tradeCount();
    expect(counts.filled).toBeGreaterThanOrEqual(2);
    expect(counts.rejected).toBeGreaterThanOrEqual(1);
    expect(counts.all).toBe(counts.filled + counts.pending + counts.rejected);
  });

  it('persists trades to localStorage on addTrade', () => {
    service.addTrade(makeTrade({ id: 'T-PERSIST' }));
    const stored = JSON.parse(localStorage.getItem('tw_trades') ?? '[]') as Trade[];
    expect(stored.some(t => t.id === 'T-PERSIST')).toBe(true);
  });
});
