import { Bond, OrderLevel, Trade } from './types';

export const MOCK_BONDS: Bond[] = [
  {
    id: 'UST10Y', name: 'US Treasury 10Y', isin: 'US912810TM94',
    coupon: 4.250, maturity: '2034-02-15', currency: 'USD', type: 'treasury',
    basePrice: 98.734375, tickSize: 0.015625, sector: 'Government',
  },
  {
    id: 'UST2Y', name: 'US Treasury 2Y', isin: 'US91282CKV53',
    coupon: 4.625, maturity: '2026-02-28', currency: 'USD', type: 'treasury',
    basePrice: 99.734375, tickSize: 0.015625, sector: 'Government',
  },
  {
    id: 'UST30Y', name: 'US Treasury 30Y', isin: 'US912810TL12',
    coupon: 4.375, maturity: '2053-11-15', currency: 'USD', type: 'treasury',
    basePrice: 94.265625, tickSize: 0.015625, sector: 'Government',
  },
  {
    id: 'UKG5Y', name: 'UK Gilt 5Y', isin: 'GB00BN65R313',
    coupon: 4.500, maturity: '2029-06-07', currency: 'GBP', type: 'gilt',
    basePrice: 99.125, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'UKG10Y', name: 'UK Gilt 10Y', isin: 'GB00BN65R420',
    coupon: 4.250, maturity: '2034-07-22', currency: 'GBP', type: 'gilt',
    basePrice: 97.845, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'DEBUND10Y', name: 'German Bund 10Y', isin: 'DE0001102614',
    coupon: 2.600, maturity: '2034-08-15', currency: 'EUR', type: 'eu-gov',
    basePrice: 92.450, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'FRGOV5Y', name: 'France OAT 5Y', isin: 'FR0014009RL9',
    coupon: 3.000, maturity: '2029-10-25', currency: 'EUR', type: 'eu-gov',
    basePrice: 96.780, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'APPL5Y', name: 'Apple Inc 5Y Senior', isin: 'US037833DZ31',
    coupon: 4.850, maturity: '2029-05-10', currency: 'USD', type: 'corporate',
    basePrice: 99.456, tickSize: 0.01, sector: 'Technology',
  },
  {
    id: 'JPMFIN7Y', name: 'JPMorgan Chase 7Y', isin: 'US46625HRL46',
    coupon: 5.000, maturity: '2031-09-15', currency: 'USD', type: 'corporate',
    basePrice: 100.125, tickSize: 0.01, sector: 'Financials',
  },
  {
    id: 'MSFIN10Y', name: 'Microsoft Corp 10Y', isin: 'US594918BV63',
    coupon: 4.600, maturity: '2034-03-01', currency: 'USD', type: 'corporate',
    basePrice: 98.230, tickSize: 0.01, sector: 'Technology',
  },
];

const priceState: Record<string, { price: number; velocity: number }> = {};
MOCK_BONDS.forEach(bond => { priceState[bond.id] = { price: bond.basePrice, velocity: 0 }; });

export function simulatePriceMove(bondId: string): number {
  const bond = MOCK_BONDS.find(b => b.id === bondId);
  if (!bond) return 100;

  const state = priceState[bondId];
  const volatility = bond.type === 'treasury' ? 0.03125 : 0.05;
  const shock = (Math.random() - 0.5) * volatility * 2;
  const reversion = (bond.basePrice - state.price) * 0.05;

  state.velocity = state.velocity * 0.7 + shock + reversion;
  state.price += state.velocity;
  state.price = Math.round(state.price / bond.tickSize) * bond.tickSize;

  const maxDrift = bond.basePrice * 0.05;
  state.price = Math.max(bond.basePrice - maxDrift, Math.min(bond.basePrice + maxDrift, state.price));

  return state.price;
}

export function getCurrentPrice(bondId: string): number {
  return priceState[bondId]?.price ?? (MOCK_BONDS.find(b => b.id === bondId)?.basePrice ?? 100);
}

export function generateOrderBook(bondId: string, midPrice: number): { bids: OrderLevel[]; asks: OrderLevel[] } {
  const bond = MOCK_BONDS.find(b => b.id === bondId);
  if (!bond) return { bids: [], asks: [] };

  const spread = bond.type === 'treasury' ? bond.tickSize * 2 : bond.tickSize * 3;
  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];

  for (let i = 0; i < 8; i++) {
    const bidPrice = Math.round((midPrice - spread / 2 - i * bond.tickSize * 2) / bond.tickSize) * bond.tickSize;
    const askPrice = Math.round((midPrice + spread / 2 + i * bond.tickSize * 2) / bond.tickSize) * bond.tickSize;
    const taper = Math.exp(-i * 0.4);
    const base = bond.type === 'treasury' ? 50 : 20;

    bids.push({ price: bidPrice, quantity: Math.round((base + Math.random() * base * 0.5) * taper * 10) / 10, orders: Math.ceil(Math.random() * 5 + 1) });
    asks.push({ price: askPrice, quantity: Math.round((base + Math.random() * base * 0.5) * taper * 10) / 10, orders: Math.ceil(Math.random() * 5 + 1) });
  }

  return { bids, asks };
}

const banks = ['Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Barclays', 'Deutsche Bank', 'BNP Paribas', 'Citi', 'UBS', 'Credit Suisse', 'HSBC'];

function randomTrade(offsetMinutes: number): Trade {
  const bond = MOCK_BONDS[Math.floor(Math.random() * MOCK_BONDS.length)];
  const direction = Math.random() > 0.5 ? 'buy' : 'sell';
  const sizes = [5, 10, 25, 50, 100, 250];
  const notional = sizes[Math.floor(Math.random() * sizes.length)];
  const price = Math.round((bond.basePrice + (Math.random() - 0.5) * 0.5) / bond.tickSize) * bond.tickSize;
  const outcomes: ('filled' | 'rejected')[] = ['filled', 'filled', 'filled', 'rejected'];
  const status = outcomes[Math.floor(Math.random() * outcomes.length)];

  return {
    id: `T${Date.now() - offsetMinutes * 60000}-${Math.random().toString(36).slice(2, 7)}`,
    time: Date.now() - offsetMinutes * 60000,
    bondId: bond.id,
    bondName: bond.name,
    direction,
    notional,
    price,
    counterparty: banks[Math.floor(Math.random() * banks.length)],
    status,
    coupon: bond.coupon,
    maturity: bond.maturity,
    yield: parseFloat((bond.coupon - (price - 100) * 0.08).toFixed(3)),
    settlementDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
  };
}

export function generateInitialTrades(): Trade[] {
  return Array.from({ length: 18 }, (_, i) => randomTrade(i * 22 + Math.random() * 15))
    .sort((a, b) => b.time - a.time);
}

export const KEYBOARD_SHORTCUTS = [
  { key: '1', description: 'Focus Order Book panel', group: 'Navigation', context: 'any' },
  { key: '2', description: 'Focus RFQ panel', group: 'Navigation', context: 'any' },
  { key: '3', description: 'Focus AI Analyst panel', group: 'Navigation', context: 'any' },
  { key: 'D', description: 'Switch to Dealer view', group: 'Navigation', context: 'any' },
  { key: 'C', description: 'Switch to Client view', group: 'Navigation', context: 'any' },
  { key: 'T', description: 'Toggle Trade Blotter', group: 'Navigation', context: 'any' },
  { key: '?', description: 'Show keyboard shortcuts', group: 'Navigation', context: 'any' },
  { key: 'N', description: 'New RFQ request', group: 'Client Actions', context: 'client' },
  { key: 'A', description: 'Accept quoted price', group: 'Client Actions', context: 'client' },
  { key: 'R', description: 'Reject quoted price', group: 'Client Actions', context: 'client' },
  { key: 'Q', description: 'Quick-quote focused RFQ', group: 'Dealer Actions', context: 'dealer' },
  { key: 'B', description: 'Place bid at selected level', group: 'Order Book', context: 'any' },
  { key: 'S', description: 'Place ask at selected level', group: 'Order Book', context: 'any' },
  { key: '/ ', description: 'Focus AI chat input', group: 'AI Panel', context: 'any' },
  { key: 'Esc', description: 'Close modal / deselect', group: 'General', context: 'any' },
];
