import {
  Component, inject, computed, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeBlotterService, BlotterFilter, SortColumn } from '../../services/trade-blotter.service';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { Trade } from '../../models/types';
import { NotionalFormatPipe, TimeFormatPipe } from '../../pipes/price-format.pipe';

@Component({
  selector: 'app-trade-blotter',
  standalone: true,
  imports: [CommonModule, NotionalFormatPipe, TimeFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="blotter-wrapper glass-panel"
         [class.panel-focused]="isFocused()"
         (click)="kbdSvc.focusedPanel.set('blotter')">

      <!-- Blotter Header (always visible) -->
      <div class="blotter-header" (click)="toggle($event)">
        <div class="header-left">
          <button class="expand-btn" [class.expanded]="isExpanded()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <span class="panel-label">TRADE BLOTTER</span>
          <div class="count-badges">
            <span class="count-badge total">{{ counts().all }}</span>
            <span class="count-badge filled">{{ counts().filled }} filled</span>
            <span class="count-badge pending">{{ counts().pending }} pending</span>
            <span class="count-badge rejected">{{ counts().rejected }} rejected</span>
          </div>
        </div>

        <div class="header-right" (click)="$event.stopPropagation()">
          <!-- Filter buttons -->
          <div class="filter-btns">
            @for (f of filters; track f.value) {
              <button class="filter-btn" [class.active]="activeFilter() === f.value"
                      (click)="setFilter(f.value)">
                {{ f.label }}
              </button>
            }
          </div>
          <kbd class="expand-kbd" title="Toggle blotter (T)">T</kbd>
        </div>
      </div>

      <!-- Collapsible Table -->
      <div class="blotter-body" [style.height]="isExpanded() ? '220px' : '0'">
        <div class="blotter-scroll">
          <table class="blotter-table">
            <thead>
              <tr>
                @for (col of columns; track col.key) {
                  <th [class.sortable]="col.sortable"
                      [class.sort-asc]="sortCol() === col.key && sortAsc()"
                      [class.sort-desc]="sortCol() === col.key && !sortAsc()"
                      (click)="col.sortable && blotter.setSort(col.key)">
                    {{ col.label }}
                    @if (col.sortable) {
                      <span class="sort-icon">
                        {{ sortCol() === col.key ? (sortAsc() ? '↑' : '↓') : '⇅' }}
                      </span>
                    }
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (trade of trades(); track trade.id) {
                <tr class="blotter-row"
                    [class.expanded-row]="trade.expanded"
                    [class.buy-row]="trade.direction === 'buy'"
                    [class.sell-row]="trade.direction === 'sell'"
                    (click)="blotter.toggleRow(trade.id)">
                  <td class="font-mono tabular-nums time-cell">{{ trade.time | timeFormat }}</td>
                  <td class="bond-cell">
                    <span class="bond-name">{{ trade.bondName }}</span>
                  </td>
                  <td>
                    <span class="dir-chip" [class.buy]="trade.direction === 'buy'" [class.sell]="trade.direction === 'sell'">
                      {{ trade.direction | uppercase }}
                    </span>
                  </td>
                  <td class="font-mono tabular-nums">{{ trade.notional | notionalFormat }}</td>
                  <td class="font-mono tabular-nums price-cell">{{ trade.price | number:'1.3-3' }}</td>
                  <td class="counterparty-cell">{{ trade.counterparty }}</td>
                  <td>
                    <span class="badge" [class]="'badge-' + trade.status">
                      {{ trade.status }}
                    </span>
                  </td>
                  <td class="expand-cell">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         [style.transform]="trade.expanded ? 'rotate(180deg)' : 'rotate(0)'"
                         style="transition: transform 200ms">
                      <path d="M19 9l-7 7-7-7"/>
                    </svg>
                  </td>
                </tr>

                <!-- Expanded detail row -->
                @if (trade.expanded) {
                  <tr class="detail-row">
                    <td colspan="8">
                      <div class="detail-grid">
                        <div class="detail-item">
                          <span class="detail-label">ISIN / ID</span>
                          <span class="detail-value font-mono">{{ trade.id }}</span>
                        </div>
                        @if (trade.coupon) {
                          <div class="detail-item">
                            <span class="detail-label">COUPON</span>
                            <span class="detail-value font-mono">{{ trade.coupon | number:'1.3-3' }}%</span>
                          </div>
                        }
                        @if (trade.maturity) {
                          <div class="detail-item">
                            <span class="detail-label">MATURITY</span>
                            <span class="detail-value font-mono">{{ trade.maturity }}</span>
                          </div>
                        }
                        @if (trade.yield) {
                          <div class="detail-item">
                            <span class="detail-label">YIELD</span>
                            <span class="detail-value font-mono" [class.bid]="trade.direction === 'buy'" [class.ask]="trade.direction === 'sell'">
                              {{ trade.yield | number:'1.3-3' }}%
                            </span>
                          </div>
                        }
                        @if (trade.settlementDate) {
                          <div class="detail-item">
                            <span class="detail-label">SETTLE</span>
                            <span class="detail-value font-mono">{{ trade.settlementDate }} (T+2)</span>
                          </div>
                        }
                        <div class="detail-item">
                          <span class="detail-label">NOTIONAL</span>
                          <span class="detail-value font-mono">{{ trade.notional | notionalFormat }} ({{ trade.notional }}M)</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              } @empty {
                <tr>
                  <td colspan="8" class="empty-row">No trades match the current filter</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .blotter-wrapper {
      display: flex;
      flex-direction: column;
      transition: border-color 200ms;
    }

    .blotter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid transparent;
      transition: border-color 200ms;
    }

    .blotter-wrapper .blotter-body[style*="220px"] ~ .blotter-header,
    .blotter-header:hover {
      border-bottom-color: var(--border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .expand-btn {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      transition: transform 200ms;

      &.expanded {
        transform: rotate(180deg);
      }
    }

    .panel-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .count-badges {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .count-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 500;

      &.total {
        background: var(--bg-elevated);
        color: var(--text-secondary);
        border: 1px solid var(--border);
      }

      &.filled { color: var(--bid); }
      &.pending { color: var(--warn); }
      &.rejected { color: var(--ask); }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filter-btns {
      display: flex;
      gap: 2px;
    }

    .filter-btn {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      transition: all 100ms;

      &:hover { background: var(--bg-elevated); color: var(--text-secondary); }

      &.active {
        background: rgba(226, 232, 240, 0.08);
        border-color: rgba(226, 232, 240, 0.18);
        color: var(--accent);
      }
    }

    .expand-kbd {
      opacity: 0.6;
    }

    .blotter-body {
      overflow: hidden;
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .blotter-scroll {
      height: 220px;
      overflow-y: auto;
    }

    .blotter-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    thead {
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(8, 8, 8, 0.95);
      backdrop-filter: blur(8px);
    }

    th {
      padding: 6px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;

      &.sortable {
        cursor: pointer;
        user-select: none;

        &:hover { color: var(--text-secondary); }
      }

      &.sort-asc, &.sort-desc { color: var(--accent); }
    }

    .sort-icon {
      margin-left: 4px;
      font-size: 9px;
      opacity: 0.7;
    }

    .blotter-row {
      cursor: pointer;
      transition: background 100ms;
      border-bottom: 1px solid rgba(30, 41, 59, 0.5);

      &:hover { background: var(--bg-hover); }
      &.expanded-row { background: rgba(226, 232, 240, 0.04); }
    }

    td {
      padding: 6px 12px;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .time-cell { color: var(--text-muted); font-size: 11px; }

    .bond-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .dir-chip {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 3px;

      &.buy { background: rgba(52, 211, 153, 0.12); color: var(--bid); }
      &.sell { background: rgba(248, 113, 113, 0.12); color: var(--ask); }
    }

    .price-cell { color: var(--text-primary); font-weight: 500; }

    .counterparty-cell { color: var(--text-muted); font-size: 11px; }

    .expand-cell {
      text-align: center;
      color: var(--text-muted);
      width: 30px;
    }

    .detail-row td {
      padding: 0;
      background: rgba(8, 8, 8, 0.4);
      border-bottom: 1px solid var(--border);
    }

    .detail-grid {
      display: flex;
      gap: 24px;
      padding: 8px 24px;
      flex-wrap: wrap;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .detail-value {
      font-size: 11px;
      color: var(--text-secondary);

      &.bid { color: var(--bid); }
      &.ask { color: var(--ask); }
    }

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: 20px;
    }
  `]
})
export class TradeBlotterComponent {
  readonly blotter = inject(TradeBlotterService);
  readonly kbdSvc = inject(KeyboardShortcutService);

  readonly isFocused = computed(() => this.kbdSvc.focusedPanel() === 'blotter');
  readonly isExpanded = this.blotter.isExpanded;
  readonly trades = this.blotter.filteredTrades;
  readonly activeFilter = this.blotter.filter;
  readonly sortCol = this.blotter.sortColumn;
  readonly sortAsc = this.blotter.sortAsc;
  readonly counts = this.blotter.tradeCount;

  readonly filters: { value: BlotterFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'filled', label: 'Filled' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
  ];

  readonly columns: { key: SortColumn; label: string; sortable: boolean }[] = [
    { key: 'time', label: 'TIME', sortable: true },
    { key: 'bondName', label: 'BOND', sortable: true },
    { key: 'direction', label: 'DIR', sortable: true },
    { key: 'notional', label: 'NOTIONAL', sortable: true },
    { key: 'price', label: 'PRICE', sortable: true },
    { key: 'counterparty', label: 'COUNTERPARTY', sortable: true },
    { key: 'status', label: 'STATUS', sortable: true },
    { key: 'status', label: '', sortable: false },
  ];

  setFilter(f: BlotterFilter): void { this.blotter.setFilter(f); }

  toggle(event: Event): void {
    this.blotter.toggleExpanded();
  }
}
