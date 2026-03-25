import { Bond, OrderLevel, Trade } from './types';

export const MOCK_BONDS: Bond[] = [
  {
    id: 'ACGB3Y', name: 'ACGB 3Y', isin: 'AU3TB0000056',
    coupon: 4.000, maturity: '2027-04-21', currency: 'AUD', type: 'treasury',
    basePrice: 99.420, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'ACGB5Y', name: 'ACGB 5Y', isin: 'AU3TB0000072',
    coupon: 4.250, maturity: '2029-06-21', currency: 'AUD', type: 'treasury',
    basePrice: 99.105, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'ACGB10Y', name: 'ACGB 10Y', isin: 'AU3TB0000064',
    coupon: 4.500, maturity: '2034-04-21', currency: 'AUD', type: 'treasury',
    basePrice: 98.760, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'ACGB20Y', name: 'ACGB 20Y', isin: 'AU3TB0000049',
    coupon: 3.250, maturity: '2044-04-21', currency: 'AUD', type: 'treasury',
    basePrice: 88.340, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'ACGB30Y', name: 'ACGB 30Y', isin: 'AU3TB0000031',
    coupon: 2.750, maturity: '2054-11-21', currency: 'AUD', type: 'treasury',
    basePrice: 79.820, tickSize: 0.01, sector: 'Government',
  },
  {
    id: 'CBA5Y', name: 'CommBank 5Y Senior', isin: 'AU3FN0057863',
    coupon: 5.150, maturity: '2029-03-15', currency: 'AUD', type: 'corporate',
    basePrice: 100.240, tickSize: 0.01, sector: 'Financials',
  },
  {
    id: 'WBC7Y', name: 'Westpac 7Y Senior', isin: 'AU3FN0061121',
    coupon: 5.250, maturity: '2031-06-10', currency: 'AUD', type: 'corporate',
    basePrice: 99.875, tickSize: 0.01, sector: 'Financials',
  },
  {
    id: 'BHP10Y', name: 'BHP Group 10Y', isin: 'AU3CB0262832',
    coupon: 4.875, maturity: '2034-05-22', currency: 'AUD', type: 'corporate',
    basePrice: 98.540, tickSize: 0.01, sector: 'Resources',
  },
  {
    id: 'TLS7Y', name: 'Telstra 7Y', isin: 'AU3CB0279380',
    coupon: 5.000, maturity: '2031-09-17', currency: 'AUD', type: 'corporate',
    basePrice: 99.680, tickSize: 0.01, sector: 'Telecommunications',
  },
  {
    id: 'MQG5Y', name: 'Macquarie Group 5Y', isin: 'AU3FN0068209',
    coupon: 5.500, maturity: '2029-11-08', currency: 'AUD', type: 'corporate',
    basePrice: 100.450, tickSize: 0.01, sector: 'Financials',
  },
];

const priceState: Record<string, { price: number; velocity: number }> = {};
MOCK_BONDS.forEach(bond => { priceState[bond.id] = { price: bond.basePrice, velocity: 0 }; });

export function simulatePriceMove(bondId: string): number {
  const bond = MOCK_BONDS.find(b => b.id === bondId);
  if (!bond) return 100;

  const state = priceState[bondId];
  const volatility = bond.type === 'treasury' ? 0.04 : 0.06;
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
    const base = bond.type === 'treasury' ? 40 : 15;

    bids.push({ price: bidPrice, quantity: Math.round((base + Math.random() * base * 0.5) * taper * 10) / 10, orders: Math.ceil(Math.random() * 5 + 1) });
    asks.push({ price: askPrice, quantity: Math.round((base + Math.random() * base * 0.5) * taper * 10) / 10, orders: Math.ceil(Math.random() * 5 + 1) });
  }

  return { bids, asks };
}

const banks = ['Commonwealth Bank', 'Westpac', 'NAB', 'ANZ', 'Macquarie', 'UBS Australia', 'Goldman Sachs AU', 'Citi Australia', 'Deutsche Bank AU', 'Morgan Stanley AU'];

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
