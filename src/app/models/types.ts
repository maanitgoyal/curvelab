export interface Bond {
  id: string;
  name: string;
  isin: string;
  coupon: number;
  maturity: string;
  currency: string;
  type: 'treasury' | 'gilt' | 'eu-gov' | 'corporate';
  basePrice: number;
  tickSize: number;
  sector?: string;
}

export interface OrderLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface OrderBook {
  bondId: string;
  bids: OrderLevel[];
  asks: OrderLevel[];
  timestamp: number;
  midPrice: number;
  prevMidPrice: number;
  changePercent: number;
}

export type RfqStatus = 'pending' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'passed';
export type TradeDirection = 'buy' | 'sell';

export interface RfqRequest {
  id: string;
  bondId: string;
  bondName: string;
  direction: TradeDirection;
  notional: number;
  status: RfqStatus;
  createdAt: number;
  expiresAt: number;
  quotedPrice?: number;
  quotedAt?: number;
  counterparty?: string;
}

export type TradeStatus = 'filled' | 'pending' | 'rejected';

export interface Trade {
  id: string;
  time: number;
  bondId: string;
  bondName: string;
  direction: TradeDirection;
  notional: number;
  price: number;
  counterparty: string;
  status: TradeStatus;
  rfqId?: string;
  expanded?: boolean;
  coupon?: number;
  maturity?: string;
  yield?: number;
  settlementDate?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isTyping?: boolean;
}

export type AppView = 'dealer' | 'client';
export type FocusedPanel = 'orderbook' | 'rfq' | 'ai' | 'blotter' | null;

export interface KeyboardShortcut {
  key: string;
  description: string;
  group: string;
  context?: 'dealer' | 'client' | 'any';
}
