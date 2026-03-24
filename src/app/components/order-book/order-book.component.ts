import {
  Component, OnInit, OnDestroy, signal, inject, computed, effect,
  ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PriceFeedService, PriceTick } from '../../services/price-feed.service';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { OrderBook, OrderLevel, Bond } from '../../models/types';
import { NotionalFormatPipe } from '../../pipes/price-format.pipe';
import { MOCK_BONDS } from '../../models/mock-data';

interface BookRow {
  price: number;
  bidQty: number;
  askQty: number;
  bidOrders: number;
  askOrders: number;
  isMid?: boolean;
  tickClass?: string;
}

@Component({
  selector: 'app-order-book',
  standalone: true,
  imports: [CommonModule, NotionalFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="order-book glass-panel"
         [class.panel-focused]="isFocused()"
         (click)="kbdSvc.focusedPanel.set('orderbook')">

      <!-- Header -->
      <div class="book-header">
        <div class="header-left">
          <span class="panel-label">ORDER BOOK</span>
          <select class="bond-selector" (change)="onBondChange($event)">
            @for (bond of bonds(); track bond.id) {
              <option [value]="bond.id" [selected]="bond.id === selectedBondId()">
                {{ bond.name }}
              </option>
            }
          </select>
        </div>
        <div class="mid-price-section">
          <div class="mid-price-display" [class.tick-up]="tickDir() === 'up'" [class.tick-down]="tickDir() === 'down'">
            <span class="mid-label">MID</span>
            <span class="mid-value font-mono tabular-nums">
              {{ formatPrice(midPrice(), selectedBond()?.type === 'treasury' ? 'treasury' : 'other') }}
            </span>
            <span class="trend-badge" [class.up]="changePercent() > 0" [class.down]="changePercent() < 0">
              <span class="trend-arrow">{{ changePercent() >= 0 ? '▲' : '▼' }}</span>
              <span>{{ absChange() | number:'1.3-3' }}%</span>
            </span>
          </div>
          <div class="spread-display">
            <span class="spread-label">SPD</span>
            <span class="spread-value font-mono">{{ spreadBps() | number:'1.1-1' }}bps</span>
          </div>
        </div>
      </div>

      <!-- Column Headers -->
      <div class="book-cols">
        <div class="col-header bid-side">QTY (M)</div>
        <div class="col-header bid-side">ORDERS</div>
        <div class="col-header center">PRICE</div>
        <div class="col-header ask-side">ORDERS</div>
        <div class="col-header ask-side">QTY (M)</div>
      </div>

      <!-- Ladder -->
      <div class="book-ladder" #ladderRef>
        @for (row of ladderRows(); track row.price; let i = $index) {
          @if (row.isMid) {
            <div class="spread-row">
              <div class="spread-line"></div>
              <span class="spread-badge">SPREAD {{ spreadBps() | number:'1.1-1' }} bps</span>
              <div class="spread-line"></div>
            </div>
          }
          @if (!row.isMid) {
            <div class="ladder-row"
                 [class.bid-row]="row.bidQty > 0"
                 [class.ask-row]="row.askQty > 0"
                 [class.selected]="selectedRow() === i"
                 (click)="selectRow(i)">

              <!-- Depth bar -->
              @if (row.bidQty > 0) {
                <div class="depth-bar-bid" [style.width.%]="(row.bidQty / maxQty()) * 100"></div>
              }
              @if (row.askQty > 0) {
                <div class="depth-bar-ask" [style.width.%]="(row.askQty / maxQty()) * 100"></div>
              }

              <!-- Bid side -->
              <div class="cell bid-qty font-mono tabular-nums" [class.active]="row.bidQty > 0">
                {{ row.bidQty > 0 ? (row.bidQty | notionalFormat) : '' }}
              </div>
              <div class="cell bid-orders" [class.active]="row.bidOrders > 0">
                {{ row.bidOrders > 0 ? row.bidOrders : '' }}
              </div>

              <!-- Price -->
              <div class="cell price font-mono tabular-nums"
                   [class.bid-price]="row.bidQty > 0"
                   [class.ask-price]="row.askQty > 0">
                {{ formatPrice(row.price, selectedBond()?.type === 'treasury' ? 'treasury' : 'other') }}
              </div>

              <!-- Ask side -->
              <div class="cell ask-orders" [class.active]="row.askOrders > 0">
                {{ row.askOrders > 0 ? row.askOrders : '' }}
              </div>
              <div class="cell ask-qty font-mono tabular-nums" [class.active]="row.askQty > 0">
                {{ row.askQty > 0 ? (row.askQty | notionalFormat) : '' }}
              </div>
            </div>
          }
        }
      </div>

      <!-- Depth Chart -->
      <div class="depth-chart-container">
        <div class="depth-chart-label">CUMULATIVE DEPTH</div>
        <svg class="depth-chart" [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" preserveAspectRatio="none">
          <!-- Bid area (right side, green) -->
          <defs>
            <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#34d399" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#34d399" stop-opacity="0.02"/>
            </linearGradient>
            <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f87171" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#f87171" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <!-- Bid area -->
          @if (bidChartPath()) {
            <path [attr.d]="bidChartPath()" fill="url(#bidGrad)" stroke="#34d399" stroke-width="1.5" stroke-opacity="0.7"/>
          }
          <!-- Ask area -->
          @if (askChartPath()) {
            <path [attr.d]="askChartPath()" fill="url(#askGrad)" stroke="#f87171" stroke-width="1.5" stroke-opacity="0.7"/>
          }
          <!-- Mid line -->
          <line [attr.x1]="chartWidth/2" y1="0" [attr.x2]="chartWidth/2" [attr.y2]="chartHeight"
                stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.3"/>
        </svg>
      </div>

      <!-- Bond Info Footer -->
      <div class="book-footer">
        <span class="footer-item">
          <span class="footer-label">CPNS</span>
          <span class="footer-value font-mono">{{ selectedBond()?.coupon | number:'1.3-3' }}%</span>
        </span>
        <span class="footer-divider"></span>
        <span class="footer-item">
          <span class="footer-label">MAT</span>
          <span class="footer-value font-mono">{{ selectedBond()?.maturity }}</span>
        </span>
        <span class="footer-divider"></span>
        <span class="footer-item">
          <span class="footer-label">CCY</span>
          <span class="footer-value font-mono">{{ selectedBond()?.currency }}</span>
        </span>
        <span class="footer-divider"></span>
        <span class="footer-item">
          <span class="footer-label">TYPE</span>
          <span class="footer-value">{{ selectedBond()?.type | uppercase }}</span>
        </span>
      </div>
    </div>
  `,
  styles: [`
    .order-book {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      transition: border-color 200ms;
    }

    .book-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .panel-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .bond-selector {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 5px;
      color: var(--text-primary);
      font-size: 12px;
      padding: 4px 24px 4px 8px;
      cursor: pointer;
      font-family: inherit;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 7px center;
      transition: border-color 150ms;

      &:focus { border-color: rgba(226, 232, 240, 0.4); outline: none; }

      option { background: var(--bg-card); }
    }

    .mid-price-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .mid-price-display {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: 5px;
      transition: box-shadow 0.6s ease-out;
    }

    .mid-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .mid-value {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .trend-badge {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;

      &.up { color: var(--bid); background: rgba(52, 211, 153, 0.1); }
      &.down { color: var(--ask); background: rgba(248, 113, 113, 0.1); }
    }

    .trend-arrow { font-size: 9px; }

    .spread-display {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .spread-label {
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 0.06em;
    }

    .spread-value {
      font-size: 11px;
      color: var(--accent-cyan);
    }

    .book-cols {
      display: grid;
      grid-template-columns: 1fr 50px 90px 50px 1fr;
      padding: 4px 12px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .col-header {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-align: center;

      &.bid-side { color: rgba(52, 211, 153, 0.6); }
      &.ask-side { color: rgba(248, 113, 113, 0.6); }
      &.center { text-align: center; }
    }

    .book-ladder {
      flex: 1;
      overflow-y: auto;
      padding: 2px 0;
    }

    .ladder-row {
      display: grid;
      grid-template-columns: 1fr 50px 90px 50px 1fr;
      padding: 3px 12px;
      cursor: pointer;
      position: relative;
      transition: background 100ms;

      &:hover { background: var(--bg-hover); }
      &.selected { background: rgba(226, 232, 240, 0.06); }
    }

    .spread-row {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      gap: 8px;
    }

    .spread-line {
      flex: 1;
      height: 1px;
      background: rgba(226, 232, 240, 0.12);
    }

    .spread-badge {
      font-size: 10px;
      color: var(--accent);
      font-weight: 600;
      letter-spacing: 0.05em;
      white-space: nowrap;
      padding: 2px 8px;
      background: rgba(226, 232, 240, 0.06);
      border: 1px solid rgba(226, 232, 240, 0.12);
      border-radius: 10px;
    }

    .cell {
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
      z-index: 1;
      position: relative;
      line-height: 1.4;

      &.active { color: var(--text-secondary); }

      &.price {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      &.bid-price { color: var(--bid); }
      &.ask-price { color: var(--ask); }
      &.bid-qty.active { color: var(--bid); }
      &.ask-qty.active { color: var(--ask); }
    }

    .depth-chart-container {
      border-top: 1px solid var(--border);
      padding: 8px 12px 6px;
      flex-shrink: 0;
    }

    .depth-chart-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .depth-chart {
      width: 100%;
      height: 60px;
    }

    .book-footer {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 7px 14px;
      border-top: 1px solid var(--border);
      background: rgba(8, 8, 8, 0.4);
      flex-shrink: 0;
    }

    .footer-item {
      display: flex;
      align-items: center;
      gap: 5px;
      flex: 1;
    }

    .footer-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .footer-value {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .footer-divider {
      width: 1px;
      height: 16px;
      background: var(--border);
      margin: 0 8px;
    }

    .tick-up {
      animation: price-up-flash 0.6s ease-out forwards;
    }

    .tick-down {
      animation: price-down-flash 0.6s ease-out forwards;
    }
  `]
})
export class OrderBookComponent implements OnInit, OnDestroy {
  readonly priceFeed = inject(PriceFeedService);
  readonly kbdSvc = inject(KeyboardShortcutService);

  readonly bonds = this.priceFeed.bonds;
  readonly selectedBondId = this.priceFeed.selectedBondId;
  readonly selectedBond = computed(() => MOCK_BONDS.find(b => b.id === this.selectedBondId()));

  private currentBook: OrderBook | null = null;
  readonly midPrice = signal(0);
  readonly changePercent = signal(0);
  readonly absChange = computed(() => Math.abs(this.changePercent()));
  readonly tickDir = signal<'up' | 'down' | 'flat'>('flat');
  readonly spreadBps = signal(0);
  readonly maxQty = signal(1);
  readonly ladderRows = signal<BookRow[]>([]);
  readonly selectedRow = signal<number | null>(null);

  readonly isFocused = computed(() => this.kbdSvc.focusedPanel() === 'orderbook');

  readonly chartWidth = 300;
  readonly chartHeight = 60;
  readonly bidChartPath = signal('');
  readonly askChartPath = signal('');

  private sub?: Subscription;
  private tickClass = '';
  private tickTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.sub = this.priceFeed.orderBook$.subscribe(book => {
      this.currentBook = book;
      this.updateFromBook(book);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.tickTimer) clearTimeout(this.tickTimer);
  }

  private updateFromBook(book: OrderBook): void {
    this.midPrice.set(book.midPrice);
    this.changePercent.set(book.changePercent);

    // Detect tick direction
    const dir = book.midPrice > book.prevMidPrice ? 'up' : book.midPrice < book.prevMidPrice ? 'down' : 'flat';
    this.tickDir.set(dir);
    if (this.tickTimer) clearTimeout(this.tickTimer);
    this.tickTimer = setTimeout(() => this.tickDir.set('flat'), 700);

    // Calculate spread in bps
    const bestBid = book.bids[0]?.price ?? book.midPrice;
    const bestAsk = book.asks[0]?.price ?? book.midPrice;
    const midForBps = (bestBid + bestAsk) / 2;
    this.spreadBps.set(midForBps > 0 ? ((bestAsk - bestBid) / midForBps) * 10000 : 0);

    // Build combined ladder
    const rows = this.buildLadder(book);
    this.ladderRows.set(rows);

    const allQtys = [...book.bids.map(b => b.quantity), ...book.asks.map(a => a.quantity)];
    this.maxQty.set(Math.max(...allQtys, 1));

    // Build depth chart
    this.buildDepthChart(book);
  }

  private buildLadder(book: OrderBook): BookRow[] {
    const rows: BookRow[] = [];

    // Asks (descending, so highest price first; displayed top to bottom)
    const asksDesc = [...book.asks].reverse();
    asksDesc.forEach(ask => {
      rows.push({
        price: ask.price,
        bidQty: 0, bidOrders: 0,
        askQty: ask.quantity, askOrders: ask.orders,
      });
    });

    // Spread row (marker)
    rows.push({ price: book.midPrice, bidQty: 0, bidOrders: 0, askQty: 0, askOrders: 0, isMid: true });

    // Bids (descending - best bid first)
    book.bids.forEach(bid => {
      rows.push({
        price: bid.price,
        bidQty: bid.quantity, bidOrders: bid.orders,
        askQty: 0, askOrders: 0,
      });
    });

    return rows;
  }

  private buildDepthChart(book: OrderBook): void {
    const w = this.chartWidth;
    const h = this.chartHeight;
    const mid = w / 2;

    // Cumulative bids (right side, descending price)
    let cumBid = 0;
    const bidPoints: [number, number][] = [];
    book.bids.forEach((bid, i) => {
      cumBid += bid.quantity;
      const x = mid - (i + 1) * (mid / book.bids.length);
      bidPoints.push([x, cumBid]);
    });

    // Cumulative asks (left side, ascending price)
    let cumAsk = 0;
    const askPoints: [number, number][] = [];
    book.asks.forEach((ask, i) => {
      cumAsk += ask.quantity;
      const x = mid + (i + 1) * (mid / book.asks.length);
      askPoints.push([x, cumAsk]);
    });

    const maxCum = Math.max(cumBid, cumAsk, 1);
    const scaleY = (v: number) => h - (v / maxCum) * (h - 4);

    // Bid path
    if (bidPoints.length > 0) {
      let path = `M ${mid} ${h}`;
      bidPoints.forEach(([x, y]) => { path += ` L ${x} ${scaleY(y)}`; });
      const firstX = bidPoints[bidPoints.length - 1][0];
      path += ` L ${firstX} ${h} Z`;
      this.bidChartPath.set(path);
    }

    // Ask path
    if (askPoints.length > 0) {
      let path = `M ${mid} ${h}`;
      askPoints.forEach(([x, y]) => { path += ` L ${x} ${scaleY(y)}`; });
      const lastX = askPoints[askPoints.length - 1][0];
      path += ` L ${lastX} ${h} Z`;
      this.askChartPath.set(path);
    }
  }

  formatPrice(price: number, type: 'treasury' | 'other'): string {
    if (price == null || isNaN(price)) return '--';
    if (type === 'treasury') {
      const handle = Math.floor(price);
      const fraction = price - handle;
      const thirtySeconds = Math.round(fraction * 32 * 10) / 10;
      const whole32 = Math.floor(thirtySeconds);
      const half = thirtySeconds - whole32 >= 0.5 ? '+' : '';
      return `${handle}-${String(whole32).padStart(2, '0')}${half}`;
    }
    return price.toFixed(3);
  }

  onBondChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.priceFeed.selectBond(id);
  }

  selectRow(i: number): void {
    this.selectedRow.set(this.selectedRow() === i ? null : i);
  }
}
