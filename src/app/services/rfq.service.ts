import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { RfqRequest, RfqStatus, TradeDirection } from '../models/types';
import { PriceFeedService } from './price-feed.service';
import { TradeBlotterService } from './trade-blotter.service';
import { MOCK_BONDS } from '../models/mock-data';

const STORAGE_KEY = 'tw_rfqs';

@Injectable({ providedIn: 'root' })
export class RfqService {
  private rfqs = signal<RfqRequest[]>(this.loadFromStorage());

  readonly pendingRfqs = computed(() => this.rfqs().filter(r => r.status === 'pending'));
  readonly quotedRfqs = computed(() => this.rfqs().filter(r => r.status === 'quoted'));
  readonly allRfqs = computed(() => this.rfqs());

  readonly rfqCreated$ = new Subject<RfqRequest>();
  readonly rfqUpdated$ = new Subject<RfqRequest>();

  private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private priceFeed: PriceFeedService,
    private blotter: TradeBlotterService,
  ) {}

  createRfq(bondId: string, direction: TradeDirection, notional: number): RfqRequest {
    const bond = MOCK_BONDS.find(b => b.id === bondId);
    const id = `RFQ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = Date.now();

    const rfq: RfqRequest = {
      id,
      bondId,
      bondName: bond?.name ?? bondId,
      direction,
      notional,
      status: 'pending',
      createdAt: now,
      expiresAt: now + 30000,
    };

    this.rfqs.update(list => [rfq, ...list]);
    this.rfqCreated$.next(rfq);
    this.persist();

    const timer = setTimeout(() => this.updateStatus(id, 'expired'), 30000);
    this.expiryTimers.set(id, timer);

    return rfq;
  }

  submitQuote(rfqId: string, price: number): void {
    const timer = this.expiryTimers.get(rfqId);
    if (timer) clearTimeout(timer);

    this.rfqs.update(list =>
      list.map(r => r.id === rfqId
        ? { ...r, status: 'quoted' as RfqStatus, quotedPrice: price, quotedAt: Date.now() }
        : r
      )
    );
    this.persist();
    const updated = this.rfqs().find(r => r.id === rfqId);
    if (updated) this.rfqUpdated$.next(updated);
  }

  passRfq(rfqId: string): void { this.updateStatus(rfqId, 'passed'); }

  removeRfq(id: string): void {
    this.rfqs.update(list => list.filter(r => r.id !== id));
    this.persist();
  }

  acceptQuote(rfqId: string): void {
    const rfq = this.rfqs().find(r => r.id === rfqId);
    if (!rfq || rfq.status !== 'quoted' || rfq.quotedPrice == null) return;

    this.updateStatus(rfqId, 'accepted');
    setTimeout(() => this.removeRfq(rfqId), 5000);
    this.blotter.addTrade({
      id: `T-${Date.now()}`,
      time: Date.now(),
      bondId: rfq.bondId,
      bondName: rfq.bondName,
      direction: rfq.direction,
      notional: rfq.notional,
      price: rfq.quotedPrice,
      counterparty: 'Internal Dealer',
      status: 'filled',
      rfqId: rfq.id,
    });
  }

  rejectQuote(rfqId: string): void {
    const rfq = this.rfqs().find(r => r.id === rfqId);
    if (!rfq || rfq.status !== 'quoted') return;

    this.updateStatus(rfqId, 'rejected');
    this.blotter.addTrade({
      id: `T-${Date.now()}`,
      time: Date.now(),
      bondId: rfq.bondId,
      bondName: rfq.bondName,
      direction: rfq.direction,
      notional: rfq.notional,
      price: rfq.quotedPrice!,
      counterparty: 'Internal Dealer',
      status: 'rejected',
      rfqId: rfq.id,
    });
  }

  getMidPrice(bondId: string): number {
    return this.priceFeed.getPrice(bondId);
  }

  getSecondsRemaining(rfq: RfqRequest): number {
    return Math.max(0, Math.ceil((rfq.expiresAt - Date.now()) / 1000));
  }

  getTimerProgress(rfq: RfqRequest): number {
    const total = rfq.expiresAt - rfq.createdAt;
    const elapsed = Date.now() - rfq.createdAt;
    return Math.max(0, Math.min(1, 1 - elapsed / total));
  }

  private updateStatus(id: string, status: RfqStatus): void {
    this.rfqs.update(list => list.map(r => r.id === id ? { ...r, status } : r));
    this.persist();
    const updated = this.rfqs().find(r => r.id === id);
    if (updated) this.rfqUpdated$.next(updated);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rfqs()));
    } catch {}
  }

  private loadFromStorage(): RfqRequest[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const list: RfqRequest[] = JSON.parse(saved);
      // Any pending RFQs from a previous session would have expired
      return list.map(r => r.status === 'pending' ? { ...r, status: 'expired' as RfqStatus } : r);
    } catch {
      return [];
    }
  }
}
