import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RfqService } from './rfq.service';
import { PriceFeedService } from './price-feed.service';
import { TradeBlotterService } from './trade-blotter.service';

describe('RfqService', () => {
  let service: RfqService;
  let blotter: TradeBlotterService;
  let priceFeed: PriceFeedService;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    blotter = new TradeBlotterService();
    priceFeed = new PriceFeedService();
    service = new RfqService(priceFeed, blotter);
  });

  afterEach(() => {
    vi.useRealTimers();
    priceFeed.ngOnDestroy();
  });

  it('creates successfully', () => {
    expect(service).toBeTruthy();
  });

  it('starts with no RFQs when storage is empty', () => {
    expect(service.allRfqs().length).toBe(0);
  });

  it('createRfq adds a pending RFQ with correct fields', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    expect(rfq.status).toBe('pending');
    expect(rfq.bondId).toBe('UST10Y');
    expect(rfq.direction).toBe('buy');
    expect(rfq.notional).toBe(10);
    expect(rfq.bondName).toBe('US Treasury 10Y');
  });

  it('createRfq is visible in allRfqs', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    expect(service.allRfqs().some(r => r.id === rfq.id)).toBe(true);
  });

  it('createRfq sets expiresAt 30 seconds ahead', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    expect(rfq.expiresAt - rfq.createdAt).toBe(30000);
  });

  it('submitQuote sets status to quoted and records price', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    service.submitQuote(rfq.id, 98.750);
    const updated = service.allRfqs().find(r => r.id === rfq.id);
    expect(updated?.status).toBe('quoted');
    expect(updated?.quotedPrice).toBe(98.750);
    expect(updated?.quotedAt).toBeDefined();
  });

  it('acceptQuote changes status to accepted', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    service.submitQuote(rfq.id, 98.750);
    service.acceptQuote(rfq.id);
    const updated = service.allRfqs().find(r => r.id === rfq.id);
    expect(updated?.status).toBe('accepted');
  });

  it('acceptQuote adds a filled trade to the blotter', () => {
    const before = blotter.tradeCount().all;
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    service.submitQuote(rfq.id, 98.750);
    service.acceptQuote(rfq.id);
    expect(blotter.tradeCount().all).toBe(before + 1);
    expect(blotter.filteredTrades()[0].status).toBe('filled');
    expect(blotter.filteredTrades()[0].price).toBe(98.750);
  });

  it('acceptQuote does nothing if RFQ is still pending', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    const before = blotter.tradeCount().all;
    service.acceptQuote(rfq.id);
    expect(blotter.tradeCount().all).toBe(before);
    expect(service.allRfqs().find(r => r.id === rfq.id)?.status).toBe('pending');
  });

  it('rejectQuote changes status to rejected', () => {
    const rfq = service.createRfq('UST10Y', 'sell', 25);
    service.submitQuote(rfq.id, 98.700);
    service.rejectQuote(rfq.id);
    expect(service.allRfqs().find(r => r.id === rfq.id)?.status).toBe('rejected');
  });

  it('rejectQuote adds a rejected trade to the blotter', () => {
    const before = blotter.tradeCount().rejected;
    const rfq = service.createRfq('UST10Y', 'sell', 25);
    service.submitQuote(rfq.id, 98.700);
    service.rejectQuote(rfq.id);
    expect(blotter.tradeCount().rejected).toBe(before + 1);
  });

  it('passRfq changes status to passed', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    service.submitQuote(rfq.id, 98.750);
    service.passRfq(rfq.id);
    expect(service.allRfqs().find(r => r.id === rfq.id)?.status).toBe('passed');
  });

  it('removeRfq removes the RFQ from the list', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    service.removeRfq(rfq.id);
    expect(service.allRfqs().some(r => r.id === rfq.id)).toBe(false);
  });

  it('accepted RFQ is auto-removed after 5 seconds', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    service.submitQuote(rfq.id, 98.750);
    service.acceptQuote(rfq.id);
    expect(service.allRfqs().some(r => r.id === rfq.id)).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(service.allRfqs().some(r => r.id === rfq.id)).toBe(false);
  });

  it('RFQ expires after 30 seconds', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    vi.advanceTimersByTime(30000);
    expect(service.allRfqs().find(r => r.id === rfq.id)?.status).toBe('expired');
  });

  it('getSecondsRemaining returns ~30 for a fresh RFQ', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    expect(service.getSecondsRemaining(rfq)).toBe(30);
  });

  it('getTimerProgress returns 1.0 for a brand new RFQ', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    expect(service.getTimerProgress(rfq)).toBeCloseTo(1, 1);
  });

  it('getTimerProgress returns ~0.5 halfway through expiry', () => {
    const rfq = service.createRfq('UST10Y', 'buy', 10);
    vi.advanceTimersByTime(15000);
    expect(service.getTimerProgress(rfq)).toBeCloseTo(0.5, 1);
  });

  it('persists RFQs to localStorage', () => {
    service.createRfq('UST10Y', 'buy', 10);
    const stored = JSON.parse(localStorage.getItem('tw_rfqs') ?? '[]');
    expect(stored.length).toBeGreaterThan(0);
  });
});
