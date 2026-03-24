import { Injectable, OnDestroy, signal } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Bond, OrderBook } from '../models/types';
import { MOCK_BONDS, simulatePriceMove, generateOrderBook } from '../models/mock-data';

export interface PriceTick {
  bondId: string;
  price: number;
  prevPrice: number;
  direction: 'up' | 'down' | 'flat';
}

@Injectable({ providedIn: 'root' })
export class PriceFeedService implements OnDestroy {
  readonly bonds = signal<Bond[]>(MOCK_BONDS);
  readonly selectedBondId = signal<string>('UST10Y');

  // prices must be declared before the book stream so buildOrderBook can read it on init
  private prices: Record<string, number> = Object.fromEntries(MOCK_BONDS.map(b => [b.id, b.basePrice]));
  private feedTimer?: Subscription;
  private ticksReceived = 0;

  private bookStream = new BehaviorSubject<OrderBook>(this.buildOrderBook('UST10Y'));
  readonly orderBook$ = this.bookStream.asObservable();

  private tickStream = new BehaviorSubject<PriceTick | null>(null);
  readonly priceTick$ = this.tickStream.asObservable();

  readonly updateCountSignal = signal(0);

  constructor() {
    this.startFeed();
  }

  get selectedBond(): Bond | undefined {
    return MOCK_BONDS.find(b => b.id === this.selectedBondId());
  }

  selectBond(bondId: string): void {
    this.selectedBondId.set(bondId);
    this.bookStream.next(this.buildOrderBook(bondId));
  }

  getPrice(bondId: string): number {
    return this.prices[bondId] ?? (MOCK_BONDS.find(b => b.id === bondId)?.basePrice ?? 100);
  }

  private startFeed(): void {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => { this.tick(); schedule(); }, 500 + Math.random() * 1000);
    };
    schedule();
    this.feedTimer = new Subscription(() => clearTimeout(timer));
  }

  private tick(): void {
    const bondId = this.selectedBondId();
    const prev = this.prices[bondId];
    const next = simulatePriceMove(bondId);
    this.prices[bondId] = next;

    const direction = next > prev ? 'up' : next < prev ? 'down' : 'flat';
    this.tickStream.next({ bondId, price: next, prevPrice: prev, direction });
    this.bookStream.next(this.buildOrderBook(bondId));

    this.ticksReceived++;
    this.updateCountSignal.set(this.ticksReceived);
  }

  private buildOrderBook(bondId: string): OrderBook {
    const fallback = MOCK_BONDS.find(b => b.id === bondId)?.basePrice ?? 100;
    const mid = this.prices[bondId] ?? fallback;
    const { bids, asks } = generateOrderBook(bondId, mid);
    const prev = this.bookStream?.getValue()?.midPrice ?? mid;
    const change = prev !== 0 ? ((mid - prev) / prev) * 100 : 0;
    return { bondId, bids, asks, timestamp: Date.now(), midPrice: mid, prevMidPrice: prev, changePercent: change };
  }

  ngOnDestroy(): void {
    this.feedTimer?.unsubscribe();
  }
}
