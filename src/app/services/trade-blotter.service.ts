import { Injectable, signal, computed } from '@angular/core';
import { Trade } from '../models/types';
import { generateInitialTrades } from '../models/mock-data';

export type BlotterFilter = 'all' | 'filled' | 'pending' | 'rejected';
export type SortColumn = 'time' | 'bondName' | 'direction' | 'notional' | 'price' | 'counterparty' | 'status';

const STORAGE_KEY = 'tw_trades';

@Injectable({ providedIn: 'root' })
export class TradeBlotterService {
  private trades = signal<Trade[]>(this.loadFromStorage());
  readonly filter = signal<BlotterFilter>('all');
  readonly sortColumn = signal<SortColumn>('time');
  readonly sortAsc = signal<boolean>(false);
  readonly isExpanded = signal<boolean>(true);

  readonly filteredTrades = computed(() => {
    let list = this.trades();
    const f = this.filter();
    if (f !== 'all') list = list.filter(t => t.status === f);

    const col = this.sortColumn();
    const asc = this.sortAsc();
    return [...list].sort((a, b) => {
      const va = a[col as keyof Trade] as any;
      const vb = b[col as keyof Trade] as any;
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
  });

  readonly tradeCount = computed(() => ({
    all: this.trades().length,
    filled: this.trades().filter(t => t.status === 'filled').length,
    pending: this.trades().filter(t => t.status === 'pending').length,
    rejected: this.trades().filter(t => t.status === 'rejected').length,
  }));

  addTrade(trade: Trade): void {
    this.trades.update(list => {
      const updated = [trade, ...list];
      this.persist(updated);
      return updated;
    });
  }

  setFilter(f: BlotterFilter): void { this.filter.set(f); }

  setSort(col: SortColumn): void {
    if (this.sortColumn() === col) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortColumn.set(col);
      this.sortAsc.set(false);
    }
  }

  toggleExpanded(): void { this.isExpanded.update(v => !v); }

  toggleRow(tradeId: string): void {
    this.trades.update(list =>
      list.map(t => t.id === tradeId ? { ...t, expanded: !t.expanded } : t)
    );
  }

  private loadFromStorage(): Trade[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : generateInitialTrades();
    } catch {
      return generateInitialTrades();
    }
  }

  private persist(list: Trade[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}
